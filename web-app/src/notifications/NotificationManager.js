export class NotificationManager {
  static requestPermission() {
    if (!("Notification" in window)) {
      console.warn("This browser does not support desktop notifications.");
      return;
    }
    
    if (Notification.permission !== "granted" && Notification.permission !== "denied") {
      Notification.requestPermission();
    }
  }

  static sendHighFatigueAlert(strainLevel) {
    if (!("Notification" in window)) return;

    if (Notification.permission === "granted") {
      const notification = new Notification("OptiSync: High Fatigue Alert", {
        body: `Your eye strain has reached ${strainLevel}%. Please take a break immediately!`,
        icon: "/vite.svg" 
      });
      
      notification.onclick = function() {
        window.focus(); // Brings the browser tab into focus
        this.close();
      };
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then(permission => {
        if (permission === "granted") {
          this.sendHighFatigueAlert(strainLevel);
        }
      });
    }
  }
}
