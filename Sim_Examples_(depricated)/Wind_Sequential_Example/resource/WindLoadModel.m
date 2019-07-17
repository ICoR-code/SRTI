function [loads] = WindLoadModel(P_frame,buildinginfo)
% < Purpose >
% To obtain the wind force applied on structure at each floor
% given the wind pressure and the geometry of the building.

% < Input variables >
% P_frame[double(1 x nfloor)]: the wind pressure corresponding to the wind
% force applied on each floor (unit: kN/m2)
% buildinginfo = [nfloors width(m) height(m) length(m) dampingratio f1(Hz)]

% < output variables >
% loads[double(1 x nfloor)]: the wind force applied on each floor(unit: kN)

% < other variables >
nfloor = buildinginfo(1); % number of floors
% L = buildinginfo(4); % length of the building (unit: m)
width = buildinginfo(2); % width of the building (unit: m)
height = buildinginfo(3); % floor height [m]
h = height*(1:nfloor); %(m)
h = h';

% calculate wind force
loads = Calc_Fv(P_frame,h,width);

end
function [Fv] = Calc_Fv(P,h,width)
% Building geometry
% h = Heights(nfloor,1)
zsize = size(h,1);                % Number of variation
story_h=zeros(zsize,1);           % story height
A=zeros(zsize,1);% impact area
story_h(1)=h(1);
for i=2:zsize
    story_h(i)=h(i)-h(i-1);
    %     A(i-1)=(story_h(i-1)+story_h(i))/2*width;
end
% A(zsize)=story_h(zsize)/2*width;

F_mid = P.*story_h.*width;
for i=1:zsize-1
    Fv(i) = (F_mid(i)+F_mid(i+1))/2;   % [kN]
    %     A(i-1)=(story_h(i-1)+story_h(i))/2*width;
end
Fv(zsize) = F_mid(zsize)/2;

end