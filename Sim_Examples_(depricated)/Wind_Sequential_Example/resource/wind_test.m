% Simulate elastic dynamic responses of a 20-story building under a wind
% event 

% clear data
clear
save DamCon
save Disp_Load
save windspeed

% initialize the damage condition
EC = 1;sng = 1; 
total_step = 500; % from 1 to 5120 (time step = 0.785 sec.)

% get building information
[nbuildings,location,buildinginfo] = Building_info;

for step = 1:total_step
    % calculate wind speed at each floor
    [speeds,step_time] = WindSpeedModel(step,buildinginfo);
    % calculate wind pressure applied on structure and cladding 
    [P_frame,P_CC] = WindPresModel(speeds,EC,sng,buildinginfo);
    % calculate the wind force applied on each floor
    [loads] = WindLoadModel(P_frame,buildinginfo);
    % calculate the elastic displacement response of each floor
    [displacement] = StruAnaModel(step,loads,buildinginfo);
    % update enclosure classification and the sng of internal pressure
    [EC,sng] = DamageModel(step,displacement,P_CC,buildinginfo);
end

% plot Roof Displacements
load windspeed.mat t
load Disp_Load disp_all
plot(t(1:total_step),disp_all(end,1:total_step));
title('Roof Displacement')
xlabel('Time (sec.)')
ylabel('Displacemnt (m)')

% building information
function [nbuildings,location,buildinginfo] = Building_info
nbuildings = 1; % number of buildings
location = [0 0 0;];  % [x y z] 
% [nfloors width height length dampingratio f1(Hz)]
buildinginfo = [20 100/3.28 3.96 140/3.28 0.02 0.5];
end