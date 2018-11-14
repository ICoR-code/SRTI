// package mainClient;

import java.lang.String;
// import mainServer.RTILib;
import java.util.PriorityQueue;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.BlockingQueue;
import java.util.HashSet;
import java.util.Map;
import java.util.HashMap;
import java.util.ArrayList;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;

// import Event;



// ----------------------------------------------------------------



/*
class EventComparator implements Comparator<Event> {
	public int compare(Event e1, Event e2) {
	    if (e1.time - e2.time > 0) return 1;
	    else if (e1.time == e2.time) return 0;
	    else return -1;
	}
}
*/



abstract class AbstractGlobalManager {
    class Node {
	int name; 
	int numinputs;
	int numoutputs;
	java.util.Vector<LinkedBlockingQueue<Event>> inchannels;
	java.util.Vector<LinkedBlockingQueue<Event>> outchannels;
	public Node(int name, int numinputs, int numoutputs) {
	    this.name = name;
	    this.numinputs = numinputs;
	    this.numoutputs = numoutputs;
	}
    }

    java.util.ArrayList<Node> nodes = new ArrayList<Node>(5);

    abstract public void publish(String publisher, String receiver, double time, String eventdata);
    abstract public Event  receive(String receiver) throws InterruptedException;

    // Each simulation node has a global index. It should be chosen to be small rather than a random value
    // in the current design to keep the data structures small. Highest index should be smaller than the
    // the total number of simulation nodes in the simulation graph.
    public void addNode(int index, int numinputs, int numoutputs) {
	if (index < 0 || numinputs < 0 || numoutputs < 0) return;  // Failure to add.
	nodes.ensureCapacity(index);  // node indexes should be chosen to be as small as possible.
	if (nodes.get(index) != null) return;  // Node already exists. 

	// Assert that all are >= 0.
	Node newnode = new Node(index, numinputs, numoutputs);
    }
    public void addLink(int source, int out, String receiver, int in) {
	
    }
}



/* This class implements the timing logic. This particular one implements the sequential logic. Events
   are delivered in strict time-sequence. */


class GlobalManagerServer {
    int numentities = 0;     // Total number of entities across all clients
    HashMap<UUID, String> entities;    // Set of simulation entities in the system, identitied by their UUIDs.
    PriorityQueue<Event> eventQueue;
    double maxtime = Double.MAX_VALUE;  // Default simulation's maximum virtual time;
    double currentTime = 0;
    boolean terminated = false;


    public GlobalManagerServer() {
	entities = new HashMap<UUID, String>();
	eventQueue = new PriorityQueue<Event>();
    }

    public boolean add(UUID sid, String name) { // Add an entity with UUID id.
	// Should add error check to see that sid is unique and not already in the system.
	// We don't particularly require name to be unique, though we could. UUIDs are used
	// to uniquely identify an object.
	if (entities.put(sid, name)) {
	    numentities++;
	    return true;
	} else return false;
    }

    public boolean addlink(UUID source, String sourceport, UUID destination, String destinationport) {
	// Not yet implemented. We want to create a Blocking FIFO queue per link and maintain the
	// graph structure. A receive() by N should
	// be wllowed to proceed when all links to N have a message on them or their time exceeds
        // the timestamp of the message on that channel.
	return true;
    }

    public synchronized void publish(UUID source, String port, double time, String eventdata) {
	// Figure out the destination(), given the addlink info.
	Event e = new Event(source, port, time, eventdata);
	eventQueue.add(e);
	notifyAll();
    }

    // Receive a message for the channel, if available.
    public synchronized Event receive(UUID receiver, String port) throws InterruptedException {
	// Should also add a check to see if the requester is an authorized subscriber.
	// If not, raise an exception.
	// Attempt a receive. If the message is not available for the requester, make the requester wait.
	Event e;
	while (true) {
	    Event e = eventQueue.peek();
	    if (e != null && channel.equals(e.channel)) {
		    e = eventQueue.remove();
		    assert (e.time >= currentTime);
		    currentTime = e.time;
	    } else {
		this.wait();	    
	    }
	}
	if (currentTime >= maxtime) {
	    e.setType(e.MessageType.TERMINATE);
	    terminated = true;
	}
    }

    public boolean setMaxTime(double maxtime) {
	if (maxtime > 0) {
	    maxtime = time;
	    return true;
	} else {
	    return false;
	}
    }
}


// This is the client side library. One or more simulation entities can be
// using this library. The library sends any requests to the global server. The simulation
// entities are referred to by a random UUID value. 

class GlobalManager {
    GlobalManagerServer gms;
    HashMap<SimulationEntity, UUID> entities;
    numentities = 0;            // Number of entities locally at this manager.

    
    public GlobalManager() {
	gms = new GlobalManagerServer();
	entities = new HashMap<SimulationEntity, UUID>();
    }

    public void add(SimulationEntity s) {
	// Add simulation entity to the system. Also give the simulation entity a unique ID.
        // That ID will be used later when it sends a message, etc.
	
	numentities++;
	while (true) {
	    UUID id = UUID.randomUUID();
	    if (gms.add(id, s.getName())) break;        // Try adding the simulation entity to the global server.
	}
	entities.put(sid, id);                          // Keep track of the ID locally.
    }
	

    public boolean addlink(SimulationEntity source, String outport, SimulationEntity dest, String inport) {
	// Add a link. One would have to assign a number to the output. May be keep a map from 
        // (source, outport) -> number. Then, add an edge. If it is a new port, then add it to the map.
	// 
	UUID sourceid = entities.get(source);
	UUID destid = entities.get(dest);
	if (sourceid == null || destid == null) return false; 
	return gms.addlink(sourceid, outport, destid, inport);
    }

    
    public synchronized boolean publish(SimulationEntity publisher, String port, double time, String eventdata) {
	// Map publisher to UUID
	UUID sourceid = entities.get(publisher);
	if (source == null) return false;
	gms.publish(source, port, time, eventdata);
    }

    // Receive a message for the channel, if available.
    public synchronized Event receive(SimulationEntity receiver, String port) throws InterruptedException {
	// Call the local or remote server to receive a message.
	UUID sourceid = entities.get(publisher);
	if (source == null) return null;
	return  gms.receive(sourceid, port);
    }
}

abstract class SimulationEntity extends Thread {

    protected GlobalManager gm;
    double vt = 0;
    double maxTime = Double.MAX_VALUE;
    volatile boolean terminated = false;
    String name;   // entity name


    public SimulationEntity(String name) {
	this.name = name;
    }


    public void addmanager(GlobalManager gms) {
	this.gm = gm;
    }

    public void publish(String port, String data) {
	gms.publish(this, port, vt, data);
    }

    // Receive a message from an input port. This call can block
    public String receive(String port) throws InterruptedException {
	try {
	    Event e = gm.receive(this, port);
	    if (e.messageType == e.MessageType.TERIMATE) {
		terminated = true;
	    }

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
	    this.execute();
	} catch (InterruptedException ex) {
	    return;   // Thread is done.
	}
    }

    public String getName() {return name;}
    abstract void execute() throws InterruptedException;
}



// There are two processors. The first one has a variable v1 
// and computes v1 = v1 + receive(v2) and sends v1 to P2.
// The second one computes v2 = v2 + receive(v1) and sends v2 to P1.
// P1 takes 1 unit of time to compute. P2 takes 2 units of time to compute.


class Fib1 extends SimulationEntity {
    int value = 0;
    // Input and output port list. Use more friendly names.
    String inport = "in";
    String outport = "out";

    public Fib1(int name, SimulationEntityManager m) {
	super(name, m);
	
    }

    public void execute() throws InterruptedException {
	int value = 1;
	
	publish(outport, Integer.toString(value));
	// System.out.println("fib1 publishes value = " + value);
	while (!isTerminated()) {
	    // Receive input value
	    System.out.println("fib1 waiting to receive");
	    String data = m.receive(inport);
	    int receivedval = new Integer(data);

	    System.out.println("fib1 receives value = " + receivedval + " at time = " + m.getTime());

	    // Compute with the value. Update local state.
	    value = value + receivedval;
	    // Let the manager know optionally how long this took.
	    advanceTime(1);

	    // Output the value on port OUT1
	    publish(outport, Integer.toString(value));
	}
    }
}


class Fib2 extends SimulationEntity {
    int value = 0;


    public Fib2(int name) {
	super(name);
    }


    public void execute(SimulationEntityManager m) throws InterruptedException {
	while (!isTerminated()) {

	    // Receive input
	    String data = receive("in");
	    int receivedval = new Integer(data);
	    System.out.println("fib2 receives value = " + receivedval + " at time = " + m.getTime());

	    // Compute with the inputs, optionally advancing time.
	    value = value + receivedval;
	    advanceTime(2);

	    // Send outputs
	    publish("out", Integer.toString(value));
	}
    }
}


public class ParallelServer {
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
	GlobalManager gm = new GlobalManager();
	double maxTime = 30;
	// Requirement: Unique name or ID must be assigned to each node.
	Fib1 s1 = new Fib1("fib1"); // (entity name, # of input ports, # of output ports, starting at index 0
	Fib2 s2 = new Fib2("fib2"); // (entity name, # of input ports, # of output ports)
	gm.add(s1);
	gm.add(s2);
	// We need to know that fib1 has an output port called out and input port called in. Same
	// for fib2.
	gm.addlink(s1, "out", s2, "in");
	gm.addlink(s2, "out", s1, "in");
	gm.setMaxTime(30);
	gm.go();
    }
}


    