// package mainClient;

import java.lang.String;
// import mainServer.RTILib;
import java.util.PriorityQueue;
import java.util.Objects;


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

class Event implements Comparable<Event> {
    public String channel = "";
    public double time = 0;
    public String eventdata = "";
    
    // Constructor
    public Event(String c, double t, String e) {
	this.channel = c;
	this.time = t;
	this.eventdata = e;
    }


    @Override
	public boolean equals (Object o) {
	if (this == o) return true;
	if (o != null && o.getClass() == getClass()) {
	    Event e = (Event) o;
	    return (e.channel == channel && e.time == time && e.eventdata == eventdata);
	} else {
	    return false;
	}
	
    }

    @Override
	public int hashCode() {
	return Objects.hash(channel, time, eventdata);
    }

    public String toString() {
	return "Event {" +
	    "channel = '" + channel + "'" +
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

/*
class EventComparator implements Comparator<Event> {
	public int compare(Event e1, Event e2) {
	    if (e1.time - e2.time > 0) return 1;
	    else if (e1.time == e2.time) return 0;
	    else return -1;
	}
}
*/

abstract class EventManager {
    abstract public void publish(String channel, double time, String eventdata);
    abstract public Event  receive(String channel) throws InterruptedException;
}



/* This class implements the timing logic. This particular one implements the sequential logic. Events
   are delivered in strict time-sequence. */

class EventQueue extends EventManager {
    PriorityQueue<Event> eventQueue;
    public EventQueue() {
	eventQueue = new PriorityQueue<Event>();
    }
    
    public synchronized void publish(String c, double time, String eventdata) {
	Event e = new Event(c, time, eventdata);
	eventQueue.add(e);
	notifyAll();
    }

    // Receive a message for the channel, if available.
    public synchronized Event receive(String channel) throws InterruptedException {
	// Should also add a check to see if the requester is an authorized subscriber.
	// If not, raise an exception.
	// Attempt a receive. If the message is not available for the requester, make the requester wait.
	while (true) {
	    Event e = eventQueue.peek();
	    if (e != null && channel.equals(e.channel)) {
		    return eventQueue.remove();
	    } else {
		this.wait();	    
	    }
	}
    }

}

class SimulationEntityManager extends Thread {

    protected EventQueue eventqueue;
    double vt = 0;
    double maxTime = Double.MAX_VALUE;
    volatile boolean terminated = false;
    SimulationEntity s;

    public SimulationEntityManager(EventQueue e, SimulationEntity s) {
	this.eventqueue = e;
	this.s = s;
    }

    public SimulationEntityManager(EventQueue e, double maxvalue, SimulationEntity s) {
	this.eventqueue = e;
	this.maxTime = maxvalue;
	this.s = s;
    }

    public void publish(String c, String data) {
	eventqueue.publish(c, vt, data);
    }

    // Receive a message from channel c. This call can block
    public String receive(String c) throws InterruptedException {
	try {
	    Event e = eventqueue.receive(c);
	    if (e.time > vt) {
		vt = e.time;
		checkTermination();
	    }
	    return e.eventdata;
	} catch (InterruptedException ex) {
	    terminated = true;   // Mark the thread as something to terminate.
	    throw ex;    // rethrow the exception again so that simulation entity knows that receive failed.
	}
    }

    private void checkTermination() {
	if (vt >= maxTime || vt < 0) {
	    terminated = true;    // Request the simulation entity to terminate at next opportunity.
	}
    }
	


    // Advance time by t if t is positive. Avoid rollback of time.
    // This is called by the simulation entity instance if it wants to advance time.
    public void advanceTime(double t) {
	if (vt + t > vt) {
	    vt = vt + t;
	}
	checkTermination();
    }

    public double getTime() {
	return vt;
    }

    public boolean isTerminated() {
	return terminated;
    }

    public void run() {
	try {
	    s.execute(this);
	} catch (InterruptedException ex) {
	    return;   // Thread is done.
	}
    }
}


abstract class SimulationEntity {
    abstract void execute(SimulationEntityManager m) throws InterruptedException;
}

// There are two processors. The first one has a variable v1 
// and computes v1 = v1 + receive(v2) and sends v1 to P2.
// The second one computes v2 = v2 + receive(v1) and sends v2 to P1.
// P1 takes 1 unit of time to compute. P2 takes 2 units of time to compute.


class Fib1 extends SimulationEntity {
    int value = 0;
    SimulationEntityManager m;

    public Fib1() {
    }

    public void execute(SimulationEntityManager m) throws InterruptedException {
	int value = 1;
	
	// Send out outputs that don't require inputs
	m.publish("fib2", Integer.toString(value));


	while (!m.isTerminated()) {

	    // Receive inputs
	    String data = m.receive("fib1");
	    int receivedval = new Integer(data);
	    System.out.println("fib1 receives value = " + receivedval + " at time = " + m.getTime());

	    // Compute and advance time (optional)
	    value = value + receivedval;
	    m.advanceTime(1);

	    // Send outputs
	    m.publish("fib2", Integer.toString(value));
	}
    }
}


class Fib2 extends SimulationEntity {
    int value = 0;

    public Fib2() {
    }

    public void execute(SimulationEntityManager m) throws InterruptedException {
	while (!m.isTerminated()) {

	    // Receive input
	    String data = m.receive("fib2");
	    int receivedval = new Integer(data);
	    System.out.println("fib2 receives value = " + receivedval + " at time = " + m.getTime());

	    // Compute and update state with the inputs, optionally advancing time.
	    value = value + receivedval;
	    m.advanceTime(2);

	    // Send out outputs
	    m.publish("fib1", Integer.toString(value));
	}
    }
}



public class SequentialServer {
    // Server Methods: 
    //      -- void subscribe(channel): client subscribes to a channel
    //      -- void publish(channel, eventtime, eventdata): client publishes
    //             a message to a channel. Message consumed once it is received
    //             by anyone.
    //      -- broadcast(channel, eventtime, eventdata);  publishes to all subscribers.  Message consumed once all subscribers receive the message.
    //      -- receive(channel, &eventtime, &eventdata); receive data from a
    //           channel. The receive fails with an exception if the client is not
    //           a subscriber.



    public static void main(String[] args) {
	EventQueue eventQueue = new EventQueue();
	double maxTime = 30;
	Fib1 s1 = new Fib1();
	Fib2 s2 = new Fib2();
	SimulationEntityManager m1 = new SimulationEntityManager(eventQueue, maxTime, s1);
	SimulationEntityManager m2 = new SimulationEntityManager(eventQueue, maxTime, s2);
	m1.start();
	m2.start();
    }

    



}
    