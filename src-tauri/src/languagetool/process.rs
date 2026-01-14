//! LanguageTool process manager
//!
//! Handles starting, monitoring, and stopping the embedded LT server.
//! Uses tokio::process for non-blocking async operations.

use std::path::PathBuf;
use std::time::Duration;
use tokio::process::{Child, Command};
use tokio::time::{sleep, timeout};

use crate::error::AppError;

/// Default port for LanguageTool server
const DEFAULT_PORT: u16 = 8081;
/// Port range to try if default is occupied (must match CSP connect-src)
const PORT_RANGE: std::ops::Range<u16> = 8081..8084;
/// Timeout waiting for LT to start
const STARTUP_TIMEOUT: Duration = Duration::from_secs(30);
/// Interval between health checks during startup
const HEALTH_CHECK_INTERVAL: Duration = Duration::from_millis(500);

/// LanguageTool process manager
pub struct LtProcess {
    /// Child process handle (None if not started)
    child: Option<Child>,
    /// Port the server is running on
    port: u16,
    /// Path to Java binary
    java_path: PathBuf,
    /// Path to LanguageTool JAR
    jar_path: PathBuf,
    /// Path to libs directory
    libs_path: PathBuf,
    /// Whether the process has been started at least once
    started_once: bool,
}

impl LtProcess {
    /// Create a new process manager
    ///
    /// # Arguments
    /// * `resources_dir` - Path to the resources directory containing runtime/ and languagetool/
    pub fn new(resources_dir: &PathBuf) -> Result<Self, AppError> {
        let java_path = resources_dir.join("runtime").join("bin").join("java");
        let jar_path = resources_dir
            .join("languagetool")
            .join("languagetool-server.jar");
        let libs_path = resources_dir.join("languagetool").join("libs");

        // Validate paths exist
        if !java_path.exists() {
            return Err(AppError::LanguageTool(format!(
                "Java not found at {:?}",
                java_path
            )));
        }
        if !jar_path.exists() {
            return Err(AppError::LanguageTool(format!(
                "LanguageTool JAR not found at {:?}",
                jar_path
            )));
        }
        if !libs_path.exists() {
            return Err(AppError::LanguageTool(format!(
                "LanguageTool libs not found at {:?}",
                libs_path
            )));
        }

        Ok(Self {
            child: None,
            port: DEFAULT_PORT,
            java_path,
            jar_path,
            libs_path,
            started_once: false,
        })
    }

    /// Check if the process is currently running
    pub fn is_running(&mut self) -> bool {
        if let Some(ref mut child) = self.child {
            // try_wait returns Ok(Some(status)) if exited, Ok(None) if still running
            match child.try_wait() {
                Ok(Some(_)) => {
                    // Process has exited
                    self.child = None;
                    false
                }
                Ok(None) => true,
                Err(_) => {
                    self.child = None;
                    false
                }
            }
        } else {
            false
        }
    }

    /// Get the port the server is running on
    pub fn port(&self) -> u16 {
        self.port
    }

    /// Check if this is the first start (for lazy loading feedback)
    pub fn is_first_start(&self) -> bool {
        !self.started_once
    }

    /// Start the LanguageTool server
    ///
    /// This is a lazy operation - LT is not started until the first correction.
    pub async fn start(&mut self) -> Result<u16, AppError> {
        // Already running?
        if self.is_running() {
            log::debug!("LT already running on port {}", self.port);
            return Ok(self.port);
        }

        log::info!("Starting LanguageTool server...");

        // Find an available port
        let port = self.find_available_port().await?;
        self.port = port;

        // Build classpath: languagetool directory (for org/ and META-INF/) + server JAR + libs/*
        let lt_dir = self.jar_path.parent().unwrap();
        let classpath = format!(
            "{}:{}:{}/*",
            lt_dir.to_str().unwrap(),
            self.jar_path.to_str().unwrap(),
            self.libs_path.to_str().unwrap()
        );

        log::debug!("Java path: {:?}", self.java_path);
        log::debug!("Classpath: {}", classpath);

        // Spawn the Java process
        let port_str = port.to_string();
        let allow_origin = format!("http://127.0.0.1:{}", port);

        let child = Command::new(&self.java_path)
            .current_dir(lt_dir) // Set working directory to languagetool dir
            .args([
                "-Xms256m",
                "-Xmx512m",
                "-XX:+UseG1GC",
                "-XX:+UseStringDeduplication",
                "-cp",
                &classpath,
                "org.languagetool.server.HTTPServer",
                "--port",
                &port_str,
                "--allow-origin",
                &allow_origin,
            ])
            .kill_on_drop(true) // Important: kill process when Child is dropped
            .spawn()
            .map_err(|e| AppError::Process(format!("Failed to spawn LT: {}", e)))?;

        self.child = Some(child);
        self.started_once = true;

        // Wait for the server to be ready
        self.wait_for_ready().await?;

        log::info!("LanguageTool started on port {}", port);
        Ok(port)
    }

    /// Stop the LanguageTool server
    pub async fn stop(&mut self) -> Result<(), AppError> {
        if let Some(mut child) = self.child.take() {
            log::info!("Stopping LanguageTool server...");

            // Try graceful shutdown first
            if let Err(e) = child.kill().await {
                log::warn!("Failed to kill LT process: {}", e);
            }

            log::info!("LanguageTool stopped");
        }
        Ok(())
    }

    /// Find an available port in the range
    async fn find_available_port(&self) -> Result<u16, AppError> {
        for port in PORT_RANGE {
            if self.is_port_available(port).await {
                return Ok(port);
            }
            log::debug!("Port {} occupied, trying next...", port);
        }

        Err(AppError::LanguageTool(format!(
            "No available port in range {:?}",
            PORT_RANGE
        )))
    }

    /// Check if a port is available
    async fn is_port_available(&self, port: u16) -> bool {
        use std::net::TcpListener;
        TcpListener::bind(("127.0.0.1", port)).is_ok()
    }

    /// Wait for the server to be ready (health check)
    async fn wait_for_ready(&self) -> Result<(), AppError> {
        let url = format!("http://127.0.0.1:{}/v2/languages", self.port);
        let client = reqwest::Client::new();

        let result = timeout(STARTUP_TIMEOUT, async {
            loop {
                match client.get(&url).send().await {
                    Ok(resp) if resp.status().is_success() => {
                        return Ok(());
                    }
                    _ => {
                        sleep(HEALTH_CHECK_INTERVAL).await;
                    }
                }
            }
        })
        .await;

        match result {
            Ok(Ok(())) => {
                // Warm-up: send a small request to pre-load French dictionaries
                self.warmup(&client).await;
                Ok(())
            }
            Ok(Err(e)) => Err(e),
            Err(_) => Err(AppError::Timeout(format!(
                "LanguageTool did not start within {:?}",
                STARTUP_TIMEOUT
            ))),
        }
    }

    /// Warm up the server by sending a small text check
    /// This pre-loads French dictionaries for faster subsequent corrections
    async fn warmup(&self, client: &reqwest::Client) {
        let url = format!("http://127.0.0.1:{}/v2/check", self.port);
        let start = std::time::Instant::now();

        log::info!("Warming up LanguageTool (loading French dictionaries)...");

        // Send a small French text to trigger dictionary loading
        let _ = client
            .post(&url)
            .form(&[("language", "fr"), ("text", "Bonjour le monde.")])
            .send()
            .await;

        log::info!("Warm-up completed in {:?}", start.elapsed());
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_port_range() {
        assert_eq!(PORT_RANGE.start, 8081);
        assert_eq!(PORT_RANGE.end, 8084);
    }
}
