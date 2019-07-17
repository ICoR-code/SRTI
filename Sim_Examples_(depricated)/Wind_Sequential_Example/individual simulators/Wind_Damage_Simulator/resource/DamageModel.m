function [EC,sng] = DamageModel(step,displacement,P_CC,buildinginfo)
% < Purpose >
% To update Enclosure classification and the sng of internal pressure of
% a building, and the damage history will be restored in "DamCon.mat".

% < Input variables >
% step[integer] = time step of interest
% displacement[double(1 x nfloor)]: the displacement of each floor(unit: m)
% P_CC[double(3 x nfloor)]:the wind pressure of Components and Cladding at
% each floor for windward, leeward, and side wall(unit: kN/m2)
% buildinginfo = [nfloors width(m) height(m) length(m) dampingratio f1(Hz)]

% < output variables >
% EC[integer]: Enclosure classification (1:Enclosed;2:Partially enclosed;3:Partially open)
% sng[integer]: sng for internal pressure (1:Positive; -1:Negative)


% < other variables >
nfloor = buildinginfo(1); % number of floors
L = buildinginfo(4); % length of the building (unit: m)
B = buildinginfo(2); % width of the building (unit: m)
height = buildinginfo(3); % floor height [m]


h = height*(1:nfloor); %(m)
h = h'; % Heights(nfloor,1)
nwindows = 100; % total number of windows per story
% L side has 30 windows and B side has 20 windows per story
% therefore total 100 windows per story
% prev_dam[integer(nfloor x nwindows)]: previous damage condition of
% wwindows (0: no damage; 1: broken)
% window_history[integer(nfloor x nwindows)]: used to record the windows
% were damaged at which step

% get the previous damage conditions of windows
if step <= 1
    prev_dam = zeros(nfloor,nwindows);
    window_history = zeros(nfloor,nwindows);
    save DamCon window_history prev_dam
    EC = 1;
    sng = 1;
else
    load DamCon prev_dam window_history
    [EC,DR,damage_condition,sng,window_history] = Calc_Damage(displacement,P_CC,prev_dam,h,B,L,nwindows,window_history,step);
    prev_dam = damage_condition;
    DR_all(1:nfloor,step) = DR(:,end);
    EC_all(step) = EC;
    save DamCon window_history prev_dam DR_all EC_all -append
end



end
function [EC,DR,damage_condition,sng,windowHistory] = Calc_Damage(displacement,P,damage_condition,h,B,L,nwindows,windowHistory,gstep)
%% Damage by pressure
if B>L
    n_w = 30; % windward & leeward
    n_s = 20; % side
else
    n_w = 20; % windward & leeward
    n_s = 30; % side
end

P_all = [repmat(P(:,1),1,n_w) repmat(P(:,2),1,n_w) repmat(P(:,3),1,2*n_s)];
nfloor = length(displacement);
% nwindows = 100;

%% setting seed for capacity
rng(0);

p_m = 75*0.047880258888889; %kPa
pressure_limit = icdf('lognormal',rand(nfloor,nwindows),log(p_m),0.2);
pressure_limit(:,1:n_w) = icdf('lognormal',rand(nfloor,n_w),log(p_m/2),0.2);

% pressure_limit = 0.5*1.25*1.3*38^2/1000; % [kN/m2]1.2358
[row,col] = find(abs(P_all) >= pressure_limit);
for i=1:length(row)
    damage_condition(row(i),col(i)) = 1;
    if windowHistory(row(i),col(i)) == 0
        windowHistory(row(i),col(i)) = gstep;
    end
end

% Damage by DR = Story Drift Ratio (nfloor x 1)
% h = 3:3:3*length(disp);
DR = zeros(length(displacement),1);
DR(1) = abs(displacement(1)/h(1));
for i = 2:length(DR)
    DR(i) = abs(displacement(i)-displacement(i-1))/(h(i)-h(i-1));
end

DR = repmat(DR,1,nwindows);
DR(:,1:2*n_w) = zeros(nfloor,2*n_w);

capacity_m = 0.02;
drift_limit = icdf('lognormal',rand(nfloor,nwindows),log(capacity_m),0.2);

[row,col] = find(abs(DR) >= drift_limit);
for i=1:length(row)
    damage_condition(row,col) = 1;
    if windowHistory(row(i),col(i)) == 0
        windowHistory(row(i),col(i)) = gstep;
    end
end

% for i = 1:length(DR)
%     if DR(i)>drift_limit(i,:)
%         damage_condition(i,1) = 1;
%     end
% end

% % Enclosure classification
A0(1) = sum(sum(damage_condition(:,1:n_w)))*4/3.28*h(1); % windward (window size=48''h)
A0(2) = sum(sum(damage_condition(:,n_w+1:2*n_w)))*4/3.28*h(1); % windward (window size=48''h)
A0(3) = sum(sum(damage_condition(:,2*n_w+1:2*n_w+n_s)))*4/3.28*h(1); % windward (window size=48''h)
A0(4) = sum(sum(damage_condition(:,2*n_w+n_s+1:end)))*4/3.28*h(1); % windward (window size=48''h)
Ag(1) = B*h(end); % gross area of that wall A0 is identified
Ag(2) = B*h(end); % gross area of that wall A0 is identified
Ag(3) = L*h(end); % gross area of that wall A0 is identified
Ag(4) = L*h(end); % gross area of that wall A0 is identified
A0i(1) = sum(sum(damage_condition))*4/3.28*h(1)-A0(1);
A0i(2) = sum(sum(damage_condition))*4/3.28*h(1)-A0(2);
A0i(3) = sum(sum(damage_condition))*4/3.28*h(1)-A0(3);
A0i(4) = sum(sum(damage_condition))*4/3.28*h(1)-A0(4);
Agi(1) = B*h(end)+L*2*h(end)+B*L;
Agi(2) = B*h(end)+L*2*h(end)+B*L;
Agi(3) = 2*B*h(end)+L*h(end)+B*L;
Agi(4) = 2*B*h(end)+L*h(end)+B*L;

if A0(1)<min(0.01*Ag(1),0.37)  % Enclosed
    EC = 1;
    if A0(2)<min(0.01*Ag(2),0.37) && A0(3)<min(0.01*Ag(3),0.37) && A0(4)<min(0.01*Ag(4),0.37)
        sng = 1; % Positive
    else
        sng = -1; % Negative
    end
elseif A0(1)>1.1*A0i(1) && A0(1)>min(0.01*Ag(1),0.37) && A0i(1)/Agi(1)<=0.2 % Partially enclosed
    EC = 2;
    sng = 1;
elseif A0(2)>1.1*A0i(2) && A0(2)>min(0.01*Ag(2),0.37) && A0i(2)/Agi(2)<=0.2 % Partially enclosed
    EC = 2;
    sng = -1;
elseif A0(3)>1.1*A0i(3) && A0(3)>min(0.01*Ag(3),0.37) && A0i(3)/Agi(3)<=0.2 % Partially enclosed
    EC = 2;
    sng = -1;
elseif A0(4)>1.1*A0i(4) && A0(4)>min(0.01*Ag(4),0.37) && A0i(4)/Agi(4)<=0.2 % Partially enclosed
    EC = 2;
    sng = -1;
    % elseif A0(1)>=0.8*Ag(1) && A0(2)>=0.8*Ag(2) && A0(3)>=0.8*Ag(3) && A0(4)>=0.8*Ag(4) % Open
    %     EC = 4;
else % Partially open
    EC = 3;
    sng = 0;
end

end
