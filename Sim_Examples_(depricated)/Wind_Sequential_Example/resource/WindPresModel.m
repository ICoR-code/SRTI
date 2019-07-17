function [P_frame,P_CC] = WindPresModel(speeds,EC,sng,buildinginfo)
% < Purpose >
% To obtain the wind pressure applied on structure and cladding at each floor
% , given the wind speeds and enclosure classification of the building.

% < Input variables >
% speeds[double(1 x nfloor)]: wind speeds at the mid of each story (unit: m/s)
% EC[integer]: Enclosure classification (1:Enclosed;2:Partially enclosed;3:Partially open)
% sng[integer]: sng for internal pressure (1:Positive; -1:Negative)
% buildinginfo = [nfloors width(m) height(m) length(m) dampingratio f1(Hz)]

% < output variables >
% P_frame[double(1 x nfloor)]: the wind pressure corresponding to the wind 
% force applied on each floor (unit: kN/m2)
% P_CC[double(3 x nfloor)]:the wind pressure of Components and Cladding at 
% each floor for windward, leeward, and side wall(unit: kN/m2)

% < other variables >
% nfloor = buildinginfo(1); % number of floors
L = buildinginfo(4); % length of the building (unit: m)
B = buildinginfo(2); % width of the building (unit: m)
height = buildinginfo(3); % floor height [m]

P_frame = Calc_Pressure_frame(speeds,EC,L,B,height,sng);
P_CC = Calc_Pressure_CC(speeds,EC,height,sng);
end

function [P_frame] = Calc_Pressure_frame(V,EC,L,B,story_h,sng)
%%
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
damping = 0.02;
n1 = 0.5;
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%


rho=1.25;                        % air density [kg/m^3]
qz = 0.5*rho*V.^2./1000;      % kN/m2
qh = qz(end); % qz at eave height
L_B = L/B;
nfloor = length(V);
h = nfloor*story_h;

% Gust wind effect factor
% gQ = 3.4;
% gv = 3.4;
% gR = sqrt(2*log(3600*n1))+0.577/(sqrt(2*log(3600*n1)));
% z_ = 0.6*h;
% % exposure B
% c = 0.3;
% l = 97.54;
% eps_ = 1/3;
% b_ = 0.45;
% alpha_ = 1/4;
%
% Iz = c*(10/z_)^(1/6);
% Lz = l*(z_/10)^eps_;
% Q = sqrt(1/(1+0.63*((B+h)/Lz)^0.63));
%
%
% % Vz = b_*(z_/10)^alpha_*V; %%%%%%%%%%%%V
% N1 = n1*Lz/Vz;
% Rn = 7.47*N1/(1+10.3*N1)^(5/3);
% eta_h = 4.6*n1*h/Vz;
% Rh = 1/eta_h-1/(2*eta_h^2)*(1-exp(-2*eta_h));
% eta_B = 4.6*n1*B/Vz;
% RB = 1/eta_B-1/(2*eta_B^2)*(1-exp(-2*eta_B));
% eta_L = 15.4*n1*L/Vz;
% RL = 1/eta_L-1/(2*eta_L^2)*(1-exp(-2*eta_L));
%
% R = sqrt(1/damping*Rn*Rh*RB*(0.53+0.47*RL));
%
% G = 0.925*((1+1.7*Iz*sqrt(gQ^2*Q^2+gR^2*R^2))/(1+1.7*gv*Iz));

G=0.85;

% % External Pressure Coefficient Cp
% Windward wall (with qz)
Cp_w = 0.8;

% Leeward wall (with qh)
if L_B>0 && L_B<=1
    Cp_l = -0.5;
elseif L_B>1 && L_B<2
    Cp_l = interp1([1 2],[-0.5 -0.3],L_B);
elseif L_B==2
    Cp_l = -0.3;
elseif L_B>2 && L_B<4
    Cp_l = interp1([2 4],[-0.3 -0.2],L_B);
elseif L_B>=4
    Cp_l = -0.2;
end

% Side wall (with qh)
Cp_s = -0.7;


% % Internal Pressure Coefficient GCpi
if EC == 1 % Enclosed
    GCpi = 0.18;
elseif EC == 2 % Partially enclosed
    GCpi = 0.55;
elseif EC == 3 % Partially open
    GCpi = 0;
    % elseif EC == 4 % Open
    %     GCpi = 0;
end


% % Wind Pressure
% Windward wall
P_w = qz*G*Cp_w-qh*sng*GCpi;
% P_w_n = qz*G*Cp_w-qh*(-GCpi);

% Leeward wall
P_l = qh*G*Cp_l-qh*sng*GCpi;
% P_l_n = qh*G*Cp_l-qh*(-GCpi);

% Side wall
% P_s_p = qh*G*Cp_s-qh*sng*GCpi;
% P_s_n = qh*G*Cp_s-qh*sng*(-GCpi);

P_frame = P_w-P_l;

end
function [P_CC] = Calc_Pressure_CC(V,EC,h,sng)
%%
Af = h*4/3.28; % effective wind area
rho=1.25;                        % air density [kg/m^3]
qz = 0.5*rho*V.^2./1000;      % kN/m2
qh = ones(size(V,1),1)*qz(end); % qz at eave height

% % External Pressure Coefficient Cp
% Positive
if Af <=1.9
    GCp_p = 0.9;
elseif Af>1.9 && Af<=46.5
    GCp_p = 0.9-0.215*log10(Af/1.9);
else
    GCp_p = 0.6;
end

% Negative
% Zone 4
if Af <=1.9
    GCp_4 = -0.9;
elseif Af>1.9 && Af<=46.5
    GCp_4 = -0.9+0.143*log10(Af/1.9);
else
    GCp_4 = -0.7;
end
% % Zone 5
% if Af <=1.9
%     GCp_5 = -1.8;
% elseif Af>1.9 && Af<=46.5
%     GCp_5 = -1.8+0.572*log10(Af/1.9);
% else
%     GCp_5 = -1.0;
% end

% % Internal Pressure Coefficient GCpi
if EC == 1 % Enclosed
    GCpi = 0.18;
elseif EC == 2 % Partially enclosed
    GCpi = 0.55;
elseif EC == 3 % Partially open
    GCpi = 0;
    % elseif EC == 4 % Open
    %     GCpi = 0;
end


% % Wind Pressure----------------------------------------------------------
% Windward wall
P_w_4 = qz*GCp_p-qh*sng*GCpi;
% P_w_n_4 = qz*GCp_p-qh*(-GCpi);

% if sum(abs(P_w_p_4)>abs(P_w_n_4))==length(P_w_p_4)
%     P_w_4 = P_w_p_4;
% else
%     P_w_4 = P_w_n_4;
% end

% Leeward wall
P_l_4 = qh*GCp_4-qh*sng*GCpi;
% P_l_n_4 = qh*GCp_4-qh*(-GCpi);
%
% if sum(abs(P_l_p_4)>abs(P_l_n_4))==length(P_l_p_4)
%     P_l_4 = P_l_p_4;
% else
%     P_l_4 = P_l_n_4;
% end

% Side wall
P_s_4 = qh*GCp_4-qh*sng*GCpi;
% P_s_n_4 = qh*GCp_4-qh*(-GCpi);
%
% if sum(abs(P_s_p_4)>abs(P_s_n_4))==length(P_s_p_4)
%     P_s_4 = P_s_p_4;
% else
%     P_s_4 = P_s_n_4;
% end


% max pressure
P_CC = [P_w_4 P_l_4 P_s_4]; % [Windward Leeward Side]


end