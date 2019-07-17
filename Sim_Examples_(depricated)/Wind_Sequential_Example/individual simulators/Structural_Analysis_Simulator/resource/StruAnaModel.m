function displacement = StruAnaModel(step,loads,buildinginfo)
% < Purpose >
% To obtain the elastic displacement response of each floor by modal
% analysis using CDM, given the wind loads, stiffness and damping ratio.
% The displacement and load history will be saved in "Disp_Load.mat"

% < Input variables >
% loads[double(1 x nfloor)]: the wind force applied on each floor(unit: kN)
% step[integer] = time step of interest
% buildinginfo = [nfloors width(m) height(m) length(m) dampingratio f1(Hz)]

% < output variables >
% displacement[double(1 x nfloor)]: the displacement of each floor(unit: m)

% < other variables >
nfloor = buildinginfo(1); % number of floors
xi = buildinginfo(5); % damping ratio

% get the modal displacement & wind load at previous step
if  step <=1
    P0 = zeros(nfloor,1);
    Qn_former = zeros(nfloor,2);
    save Disp_Load Qn_former;
elseif step >1
    load Disp_Load loads_all disp_all Qn_former
    P0 = loads_all(1:nfloor,step-1);
end

[displacement,Qn_former] = Calc_Disp(loads,P0,xi,nfloor,Qn_former);
disp_all(1:nfloor,step) = displacement;
loads_all(1:nfloor,step) = loads;

% save the modal displacement & wind load for the next step
save Disp_Load disp_all loads_all Qn_former -append

end
function [displacement,Qn_former]=Calc_Disp(P1,P0,xi,nfloor,Qn_former)
% MDOF Lumped-Mass System
% n story structure subject to lateral load P
% ----- Structure information -----
% nfloor = 20;                  % number of stories
m = 643*ones(nfloor,1);              % mass of each story
k = 270000*ones(nfloor,1);             % stiffness of each story
alpha = 0.917; beta = 0.002;          % Rayleigh damping constants
% xi = 0.02;                      % damping ratios
dt = 0.7854;                     % time step
% ----- Forming mass and stiffness matrices for system ----
[M,K]=formSystMK(m,k);
load Flex_same_h.mat K_20story
K = K_20story*175.127*2; % [kip/in] -> [kN/m] two moment frames
[displacement,Qn_former] = ModalAnalysisCDM(M,K,dt,alpha,beta,xi,nfloor,P0,P1,Qn_former);
end
function [M,K]=formSystMK(m,k)
M = diag(m);
K = zeros(length(k));
for i = 1:length(k)
    if i == 1
        K(i,i) = K(i,i) + k(i);
    else
        K(i-1:i,i-1:i) = K(i-1:i,i-1:i) + k(i)*[1 -1;-1 1];
    end
end
end