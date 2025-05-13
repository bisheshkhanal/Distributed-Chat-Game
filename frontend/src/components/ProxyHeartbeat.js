import { useEffect, useContext } from "react";
import config from "../config";
import { GameContext } from "./GameContext";

// This component continuously checks if proxies are alive by pinging their /game/heartbeat endpoints.
// It updates the GameContext with the proxy statuses and selects an available proxy for future use.
const ProxyHeartbeatChecker = () => {
  const { assignedProxy, setAssignedProxy, proxyStatuses, setProxyStatuses } = useContext(GameContext);
  
  // List of proxy endpoints to ping for heartbeat
  const urls = [
    { name: "proxy1", url: `${config.API_PROXY1_URL}/game/heartbeat` },
    { name: "proxy2", url: `${config.API_PROXY2_URL}/game/heartbeat` }
  ];

  // Checks all proxies and returns an object like { proxy1: true/false, proxy2: true/false }
  const checkAllProxiesAlive = async () => {

    const results = {};

    for (const { name, url } of urls) {
      try {
        const response = await fetch(url, {
          method: "GET",
          headers: { "Content-Type": "application/json" }
        });

        // console.log("[DEBUG] ",name,response)

        const text = await response.json();
        results[name] = response.ok && text === "I'm alive!";
      } catch (err) {
        // console.log(`Heartbeat failed for ${name}:`, err);
        results[name] = false;
      }
    }
    return results;
  };

  // Polling heartbeat status every 5 seconds and updating context accordingly
  useEffect(() => {
    const interval = setInterval(async () => {
      const results = await checkAllProxiesAlive();
      setProxyStatuses(results);
      if (results.proxy1) {
        setAssignedProxy(config.API_PROXY1_URL);
      } else if (results.proxy2) {
        setAssignedProxy(config.API_PROXY2_URL);
      } else {
        setAssignedProxy(null);
      }
    }, 5000); // every 5 seconds

    // Cleanup on unmount
    return () => clearInterval(interval);
  }, [setProxyStatuses]);

  // Debug: Log whenever proxy status changes
  useEffect(() => {
    console.log("[DEBUG]",proxyStatuses)
  }, [proxyStatuses])


  return null;
};

export default ProxyHeartbeatChecker;
