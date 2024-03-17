function [gaPN,gvPN] = getGM_1_PN (nodePN,timestamp)

referPointXY = [0,0]; % unit: km
epicenterXY = [0,34]; % unit: km
% shock1_stage = 0;
shock1_pga = 0.202; % unit: g
% shock2_stage = 2;
% shock2_pga = 0.341; % unit: g


% if stage == shock1_stage
    target_pga = shock1_pga;
    shock_flag = 1;
% elseif stage == shock2_stage
%     target_pga = shock2_pga;
%     shock_flag = 2;
% end


% << Hazard Scenario Simulator >> provides the ground motions at the reference point
[ga_scaled,gv_scaled] = getStepAbsScaledGM(timestamp,target_pga,shock_flag); % unit: g,cm/s
% << Hazard Intensity Simulator >> provides the attenuated ground motions at the other locations
[gaPN,gvPN] = getAttenGM_NW(nodePN,...
    referPointXY,ga_scaled,gv_scaled,epicenterXY);
end

function [ga_scaled,gv_scaled] = getStepAbsScaledGM(step,targeted_pga,shock_flag)
% < Purpose >

% < Input variables >
% step[double(1 x numStep)]: the step number of inquired records.
% e.g., inquiring ground motion from step 3 to 30, then < step = 3:30; > 

% < output variables >
% referPointXY[double(1x2)]: local coordinates(x,y) of reference point, 
% where the ground motion being recorded. (unit: km)
% ga_scaled[double(1 x numStep)]: ground acceleration at reference point (unit: g)
% gv_scaled[double(1 x numStep)]: ground velocity at reference point (unit: cm/s)
% epicenterXY[double(1x2)]: local coordinates(x,y) of epicenter (unit: km)

% referPointXY = [0,0]; % unit: km
% epicenterXY = [0,34]; % unit: km
% targeted_pga = 0.33; % unit: g
% targeted_pgv = 25; % unit: cm/s

%% file name of ground motion records
%     filename_ax = 'RSN68_SFERN_PEL090.AT2';
%     filename_ay = 'RSN68_SFERN_PEL180.AT2';
%     filename_vx = 'RSN68_SFERN_PEL090.VT2';
%     filename_vy = 'RSN68_SFERN_PEL180.VT2';
% if shock_flag == 1
    filename = 'RSN5223.mat';
    skipNStep = 4000;
% elseif shock_flag == 2
%     filename = 'RSN6536.mat';
%     skipNStep = 3500;
% end

if exist(filename,'file') == 2
    load(filename, 'abs_raw_acc', 'raw_pga', 'abs_raw_vel', 'raw_pgv', 'envelope_step')
else
    disp('no gm data');
    %% Ground acceleration
%     raw_acc_x = load(filename_ax);
%     [m,n]= size(raw_acc_x);
%     raw_acc_x = reshape(raw_acc_x',m*n,1);
%     raw_acc_y = load(filename_ay);
%     [m,n]= size(raw_acc_y);
%     raw_acc_y = reshape(raw_acc_y',m*n,1);
%     abs_raw_acc = sqrt(raw_acc_x.^2 + raw_acc_y.^2);
%     raw_pga = max(abs_raw_acc);
%     %% Ground velocity
%     raw_vel_x = load(filename_vx);
%     [m,n]= size(raw_vel_x);
%     raw_vel_x = reshape(raw_vel_x',m*n,1);
%     raw_vel_y = load(filename_vy);
%     [m,n]= size(raw_vel_y);
%     raw_vel_y = reshape(raw_vel_y',m*n,1);
%     abs_raw_vel = sqrt(raw_vel_x.^2 + raw_vel_y.^2);
%     raw_pgv = max(abs_raw_vel);
%     save gm_data.mat raw_acc_x raw_acc_y abs_raw_acc raw_pga raw_vel_x raw_vel_y abs_raw_vel raw_pgv
end
factor = targeted_pga/raw_pga;
ga_scaled = abs_raw_acc(envelope_step(step,1),1)'*factor;
gv_scaled = abs_raw_vel(envelope_step(step,1),1)'*factor;

% ga_scaled = abs_raw_acc(step+skipNStep,1)'/raw_pga*targeted_pga;
% gv_scaled = abs_raw_vel(step+skipNStep,1)'/raw_pgv*targeted_pgv;


end

function [gaPN,gvPN] = getAttenGM_NW(nodePN,referPointXY,ga_scaled,gv_scaled,epicenterXY)
% dt = 0.01; % sec

%% calculate attenuated ground motion
[gaPN,gvPN] = getAttenGM(nodePN(:,2:3),referPointXY,ga_scaled,gv_scaled,epicenterXY);
% [gaWN,gvWN] = getAttenGM(nodeWN(:,2:3),referPointXY,ga_scaled,gv_scaled,epicenterXY);
% [gaGN,gvGN] = getAttenGM(nodeGN(:,2:3),referPointXY,ga_scaled,gv_scaled,epicenterXY);

% gaPN = ones(size(nodePN,1),1)*ga_raw;
% gvPN = ones(size(nodePN,1),1)*gv_raw;
% gaWN = ones(size(nodeWN,1),1)*ga_raw;
% gvWN = ones(size(nodeWN,1),1)*gv_raw;
% gaGN = ones(size(nodeGN,1),1)*ga_raw;
% gvGN = ones(size(nodeGN,1),1)*gv_raw;
end

function [ga_atten,gv_atten] = getAttenGM(nodeXY,referPointXY,ga,gv,epicenterXY)
% < Purpose >
% Given the epicenter, the ground motion records and the location of 
% measurement station(reference point), estimate the attenuated ground
% motion at  arbitrary locations using the attenuation equations by
% Atkinson and Boore (1995), and the default standard deviation is zero. 
% Otherwise, change the variable: std.

% < Input variables >
% nodeXY[double(numNode x 2)]: local coordinates(x,y) of each node (unit: km)
% referPointXY[double(1x2)]: local coordinates(x,y) of reference point,
% where the ground motion being recorded. (unit: km)
% ga[double(1 x numStep)]: ground acceleration at reference point (unit: g)
% gv[double(1 x numStep)]: ground velocity at reference point (unit: cm/s)
% epicenterXY[double(1x2)]: local coordinates(x,y) of epicenter (unit: km)

% < Output variables >
% ga_atten[double(numNode x numStep)]: attenuated ground acceleration at each node (unit: g)
% gv_atten[double(numNode x numStep)]: attenuated ground velocity at each node (unit: cm/s)


%% back calculate magnitude using the attenuation equations by Atkinson and Boore (1995)
% log10(PGA)[cm/s^2] = 3.79 + 0.298*(Mw -6) - 0.0536*(Mw -6)^2 - log10(R) -
% 0.00135*R[km]
% log10(PGV)[cm/s] = 2.04 + 0.422*(Mw -6) - 0.0373*(Mw -6)^2 - log10(R)[km]
% Take the average of the backed-calculated Ms’
% let A = magnitude Mw -6
r0 = norm(epicenterXY-referPointXY);
A1 =(-0.298+sqrt(0.298^2-4.*(-0.0536).*(3.79-log10(r0)-0.00135*r0-log10(980.665*ga))))./2./(-0.0536);
A2 =(-0.422+sqrt(0.422^2-4.*(-0.0373).*(2.04-log10(r0)-log10(gv))))./2./(-0.0373);
A = (A1+A2)/2;

%% Calculate ga(t,r) and gv(t,r) at any location with epicentral distance r
% ga_atten = zeros(size(nodeXY,1),size(ga,2));
% gv_atten = zeros(size(nodeXY,1),size(gv,2));
std = 0; % the default standard deviation

r = ((nodeXY(:,1)- epicenterXY(1,1)).^2 + (nodeXY(:,2)- epicenterXY(1,2)).^2).^(0.5);
log10ga = 3.79 + 0.298.*A1 - 0.0536.*A1.^2 - log10(r) - 0.00135*r;
ga_atten_mean = 10.^log10ga/980.665; % unit: g
ga_atten = lognrnd(log(ga_atten_mean),std);

log10gv = 2.04 + 0.422.*A2 - 0.0373.*A2.^2 - log10(r);
gv_atten_mean = 10.^log10gv; % unit: [cm/s]
gv_atten = lognrnd(log(gv_atten_mean),std);

% for step = 1:size(ga,2)
%     log10ga = 3.79 + 0.298*A1(step) - 0.0536*A1(step)^2 - log10(r) - 0.00135*r;
%     ga_atten(:,step) = 10.^log10ga/980.665; % unit: g
%     log10gv = 2.04 + 0.422*A2(step) - 0.0373*A2(step)^2 - log10(r);
%     gv_atten(:,step) = 10.^log10gv; % unit: [cm/s]
% end
end