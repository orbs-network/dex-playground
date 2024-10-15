import { TimeDuration } from "@orbs-network/twap-sdk";
import moment from "moment";

export const fillDelayText = (fillDelay?: TimeDuration) => {
    if (!fillDelay) {
        return "";
    }
    const value = fillDelay.unit * fillDelay.value;
    const time = moment.duration(value);
    const days = time.days();
    const hours = time.hours();
    const minutes = time.minutes();
    const seconds = time.seconds();
  
    const arr: string[] = [];
  
    if (days) {
      arr.push(`${days} days `);
    }
    if (hours) {
      arr.push(`${hours} hours `);
    }
    if (minutes) {
      arr.push(`${minutes} minutes`);
    }
    if (seconds) {
      arr.push(`${seconds} seconds`);
    }
    return arr.join(" ");
  };
  