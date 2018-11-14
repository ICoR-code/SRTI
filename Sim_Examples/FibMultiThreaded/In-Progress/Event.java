// package mainClient;

import java.lang.String;
// import mainServer.RTILib;
import java.util.PriorityQueue;
import java.util.Objects;
import java.util.UUID;


/*
 The following classes are infrastructure classes. They can be moved to a separate file.
 -- Event
 -- EventQueue
 -- SimulationEntityManager
 -- SimulationEntity


 The following classes are modified by the simulation modeler: 

 -- Fib1: Models the first simulation entity. It generates a value. Then, it loops, receiving a value from fib2, accumulating it in a local value, and then sending that value to Fib2.
 -- Fib2: similar to Fib1, except that it does not generate a value initially.
 -- SequentialServer: Launches Fib1 and Fib2 and sets the max simulation time.
 */



public class Event implements Comparable<Event> {
    public String channel = "";
    public UUID source;
    public String sourceport;
    public double time = 0;
    public String eventdata = "";
    public enum MessageType {TERMINATE, NORMAL, TIMEONLY};
    public MessageType messageType;
    
    // Constructor
    public Event(UUID source, String sourceport, double t, String e) {
	this.source = source;
	this.sourceport = sourceport;
	this.time = t;
	this.eventdata = e;
	this.messageType = MessageType.NORMAL;
    }

    public void setType(MessageType t) {
	this.messageType = t;
    }

    public MessageType getType() {
	return messageType;
    }


    @Override
	public boolean equals (Object o) {
	if (this == o) return true;
	if (o != null && o.getClass() == getClass()) {
	    Event e = (Event) o;
	    return (e.source == source && e.sourceport == sourceport && e.time == time && e.eventdata == eventdata &&
		    e.messageType == messageType);
	} else {
	    return false;
	}
	
    }

    @Override
	public int hashCode() {
	return Objects.hash(source, sourceport, time, eventdata);
    }

    public String toString() {
	return "Event {" +
	    "source = '" + source + "'" +
	    "sourceport = " + sourceport + 
	    "\ntime = " + time + 
	    "\neventdata = " + eventdata;
    }

    @Override
	public int compareTo(Event e) {
	if (time - e.time > 0) {
	    return 1;
	} else if (time == e.time) {
	    return 0;
	} else {
	    return -1;
	}
    }
	    
	    
}
