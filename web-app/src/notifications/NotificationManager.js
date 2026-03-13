export class NotificationManager {
  static async requestPermission() {
    if (!("Notification" in window)) {
      console.warn("This browser does not support desktop notifications.");
      return false;
    }
    
    if (Notification.permission === "default") {
      const permission = await Notification.requestPermission();
      return permission === "granted";
    }
    
    return Notification.permission === "granted";
  }

  static sendTestAlert() {
    if (!("Notification" in window)) return;
    if (Notification.permission === "granted") {
      try {
        const n = new Notification("OptiSync OS: Connection Verified", {
          body: "Your cognitive operating system is now synchronized with the Chrome extension. We'll monitor your strain and alert you when a reset is needed.",
          icon: "/vite.svg",
          tag: "optisync-connect",
          requireInteraction: false
        });
        n.onclick = () => window.focus();
      } catch (e) {
        console.error("Failed to send test notification:", e);
      }
    }
  }

  static sendHighFatigueAlert(strainLevel) {
    if (!("Notification" in window)) return;

    if (Notification.permission === "granted") {
      try {
        const notification = new Notification("OptiSync: High Fatigue Alert", {
          body: `Your eye strain has reached ${strainLevel}%. Please take a break immediately!`,
          icon: "/vite.svg",
          requireInteraction: true // Ensures it stays on screen until dismissed so the user actually sees it!
        });
        
        notification.onclick = function() {
          window.focus(); // Brings the browser tab into focus
          this.close();
        };
      } catch (e) {
        console.error("Failed to send notification:", e);
      }
    } else if (Notification.permission === "default") {
      // Don't request inside the background worker! Simply log it.
      console.warn("Notification permission is not granted. Cannot send background alert.");
      // If we are in the foreground, we could request it, but typically we shouldn't unless triggered by click.
    }
  }
}
