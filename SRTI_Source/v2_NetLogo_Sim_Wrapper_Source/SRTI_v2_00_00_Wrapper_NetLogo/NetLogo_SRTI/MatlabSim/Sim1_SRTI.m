function Sim1_SRTI
% Initialize SRTI
javaaddpath SRTI_v1_00_01.jar;
import mainServer.*;
rtiLib = RTILib();
hostname = "localhost";
portnum = "42010";
rtiLib.setSimName("Sim1_SRTI");
rtiLib.connect(hostname, portnum);
rtiLib.subscribeTo("NetLogo");
millis_to_wait = 1000;

% Initialize step
step = 0;
type1error = 0.05;
simulationOnGoing = true;
testMat = [10,11,12,13
           13,12,11,10];

%------------- Publish initial msg----------------------------
msg = rtiLib.setJsonObject("", "Step", mat2str(step));
msg = rtiLib.setJsonObject(msg, "Type1Error", mat2str(type1error));
msg = rtiLib.setJsonObject(msg, "2DArray", mat2str(testMat));
rtiLib.publish("Sim1", msg);
fprintf(['Sim1 publishes step ', num2str(step),', type1Error = ', num2str(type1error), '\n']);

while simulationOnGoing
    %---------------- Subscribe ----------------------------
    msg_net = rtiLib.getNextMessage("NetLogo",millis_to_wait);
    if ~isempty(msg_net)&& strcmp(string(msg_net),"") == 0
        m_net=rtiLib.getMessageContent(msg_net)
        tick = str2num(rtiLib.getJsonObject("Tick",m_net));
        jst_benefit(tick) = str2double(rtiLib.getJsonObject("Jst_benefit",m_net));
        pct_fraud(tick) = str2double(rtiLib.getJsonObject("Pct_fraud",m_net)); 
        w_list = str2num(rtiLib.getJsonObject("w_list",m_net))
        fprintf(['Sim1 received msg at step ', num2str(tick)]);
        fprintf(['; Jst_benefit: ', num2str(jst_benefit(tick))]);
        fprintf(['; Pct_fraud: ', num2str(pct_fraud(tick)), '\n']);
        fprintf(['; w_list: ', mat2str(w_list), '\n']);
        %------------- calculation ------------------------------
        step = tick;
        type1error = type1error + 0.01; 
        testMat(1,1) = testMat(1,1)+1;
        
    end
    
    %------------- Publish ----------------------------------
    msg = rtiLib.setJsonObject("", "Step", mat2str(step));
    msg = rtiLib.setJsonObject(msg, "Type1Error", mat2str(type1error));
    msg = rtiLib.setJsonObject(msg, "2DArray", mat2str(testMat));
    rtiLib.publish("Sim1", msg);
    fprintf(['Sim1 publishes step ', num2str(step),', type1Error = ', num2str(type1error), '\n']);
end

% fprintf('Damage disconnect\n');
% rtiLib.disconnect();

end

%% actural function for simulation
