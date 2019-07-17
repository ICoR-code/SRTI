function [step_V,step_time] = WindSpeedModel(step,buildinginfo)
% < Purpose >
% To obtain the wind speed at the interest heights at specific time step
% The default setting is a 20-story building with height = 3.96 m for each 
% story and V10 = 40 m/s

% < Input variables >
% step[integer] = time step of interest, an integer between 1 and 5120
% buildinginfo = [nfloors width(m) height(m) length(m) dampingratio f1(Hz)]

% < output variables >
% step_V[double(1 x nfloor)]: a vector containing the wind speed of the
% heights of interets(The default is the height at the mid of each story) (unit: m/s)
% step_time[double]: simulation time of that step (unit: sec.)


% < other variables > 
V10 = 40; % mean wind speed at 10m height [m/s]
height = buildinginfo(3); % floor height [m]
nfloor = buildinginfo(1); % number of floors
% h = the heights of the points that you want to get wind speed information
% the height of each floor
% h = (1:nfloor)*height; %(m)
% the height at the mid of each story
h = height/2:height:height*nfloor-height/2; %(m)


%% check if windspeed time history exists
% if not, run create a random windspeed time history
if exist('windspeed.mat', 'file') ~= 2   
    [V,t,Vz]=Calc_WindSpeed(V10,h);  %(V10,Heights)
    save windspeed V t Vz
else
    load windspeed.mat V t
    if exist('V','var') ~= 1   
        [V,t,Vz]=Calc_WindSpeed(V10,h);  %(V10,Heights)
        save windspeed V t Vz
    end
end

%% the wind speed at specific time step
step_time = t(step);
step_V(1:nfloor) = V(step,1:nfloor);
%     Vz = Vz;

end

function [V,t,WS_z_]=Calc_WindSpeed(V10,h)
% Building geometry
% h = 3:storyHeight:storyHeight*nfloor;                       % Heights
zsize = size(h,2);                % Number of variation
% Inputs
z0 = 0.02;                        % mean site roughness

% Generate WSvector wind speed at each floor
[WS,WS_z_] = generateWSvector(h,zsize,z0,V10);
% Generate wind speed at each floor
[V,t,dt]=windspeed1(h,WS,V10,zsize,z0);
V=V(1:5120,:);
t=t(1:5120)';
end


