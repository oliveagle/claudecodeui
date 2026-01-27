// hooks/useVersionCheck.js
import { useState, useEffect } from 'react';
import { version } from '../../package.json';

// Simple semver comparison (major.minor.patch)
function isGreaterVersion(latest, current) {
  const latestParts = latest.split('.').map(n => parseInt(n) || 0);
  const currentParts = current.split('.').map(n => parseInt(n) || 0);

  for (let i = 0; i < 3; i++) {
    if (latestParts[i] > currentParts[i]) return true;
    if (latestParts[i] < currentParts[i]) return false;
  }
  return false; // Versions are equal
}

export const useVersionCheck = (owner, repo) => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [latestVersion, setLatestVersion] = useState(null);
  const [releaseInfo, setReleaseInfo] = useState(null);

  useEffect(() => {
    const checkVersion = async () => {
      try {
        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases/latest`);
        const data = await response.json();

        // Handle the case where there might not be any releases
        if (data.tag_name) {
          const latest = data.tag_name.replace(/^v/, '');
          setLatestVersion(latest);
          // Only show update if latest version is greater than current
          setUpdateAvailable(isGreaterVersion(latest, version));

          // Store release information
          setReleaseInfo({
            title: data.name || data.tag_name,
            body: data.body || '',
            htmlUrl: data.html_url || `https://github.com/${owner}/${repo}/releases/latest`,
            publishedAt: data.published_at
          });
        } else {
          // No releases found, don't show update notification
          setUpdateAvailable(false);
          setLatestVersion(null);
          setReleaseInfo(null);
        }
      } catch (error) {
        console.error('Version check failed:', error);
        // On error, don't show update notification
        setUpdateAvailable(false);
        setLatestVersion(null);
        setReleaseInfo(null);
      }
    };

    checkVersion();
    const interval = setInterval(checkVersion, 5 * 60 * 1000); // Check every 5 minutes
    return () => clearInterval(interval);
  }, [owner, repo]);

  return { updateAvailable, latestVersion, currentVersion: version, releaseInfo };
}; 