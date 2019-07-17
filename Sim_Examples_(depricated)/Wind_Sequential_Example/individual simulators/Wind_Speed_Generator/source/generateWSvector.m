function [WS,WS_z_] = generateWSvector(H,Hsize,z0,V10)

% This function gives as output a vector of simulated wind speeds of length
% Nsim at heigth H above ground for roughness length at the site of z0


%% Uncertainties
% % Set the seed for the generation of the random variables
% randn('state',1)
% rand('twister',1)
% 
% theta = randn(1,8);
% % Random variable characteristics
% 
% Sampling errors in the wind speed
e1m = 1;
e1std = 0.1; 
% Wind speed observation error (normal)
e2m = 1;
e2std = 0.025; 
% Random wind speed
% u2m = 0;
% u2std = 1;
% Uncertain conversion between 1-min and 1-hour (normal)
e3m = 0.8065;
e3std = 0.05*e3m;
% Epistemic model uncertainty 1 (truncated normal)
e4m = 1;
e4std = 0.1;
% Uncertainty in the site roughness (uniform)
e5m = 0.5;
e5std = 1;
% Uncertainty in the roughness where the wind speeds were measured
% (truncated normal)
e6m = 1;
e6std = 0.3;
% Epistemic model uncertainity 2 (i.e. uncertainty in using the model for
% going from 10m height to full height etc) (normal)
e7m = 1;
e7std = 0.05;

% % Generate random variables
% e1  = e1m + e1std*theta(1);
% e2  = e2m + e2std*theta(2);
% e3  = e3m + e3std*theta(3);
% % e4  = (randTruncNorm_2(e4m,e4std,0,2,Nsim))';
% e4  = uniform(0.5,1.5,theta(4));
% e5  = e5m+ e5std*uniform(0,1,theta(5));    %generate z0 to be uniformly distributed between 0.01 and 0.03
% % e6  = (randTruncNorm_2(e6m,e6std,0,2,Nsim))';
% e6  = uniform(0.5,1.5,theta(6));
% e7  = e7m + e7std*theta(7);
% %u2 = randn(1,Nsim);
% % r = rand(1,Nsim);
% % WS = zeros(1,Nsim);

e1 = e1m;
e2 = e2m;
e3 = e3m;
e4 = 1;
e5 = 1;
e6 = 1;
e7 = e7m;

% generate V10
% V10=type2(theta(8));
% function [V10]=type2(var)
% % DISTRIBUTIONS FOR WIND SPEED
% % Parameters for Type II
% mu_V10  = 30;   % Mean maximum annual wind speed [m/s]
% std_V10  = 3.5; % Standard deviation of the maximum annual wind speed [m/s]
% k  = 1.182856/(std_V10/mu_V10) + 1.214615;
% w  = mu_V10/gamma(1 - (1/k));
% V10  = w./((-log(cdf('Normal',var,0,1))).^(1/k));
% end


%% Random IM = VH ----------------------------------------------------------
% Wind speed model --------------------------------------------------------
Hmet        = 10;
%H = 10; % check - i  think this has always to be 10 m above ground, considering how we did the scaling from the wind tunnel data
z01   = 0.05;
% [V_im,reccurrence] = HurrData3;

WS_h_1_min = e1.*V10;
WS=zeros(Hsize,1);
WS_z_=zeros(1,1);
%% Generate random vector of wind speeds
% for i = 1:Nsim
    for ii=1:Hsize
        WS(ii) = (e7*e3*(e5*z0/(e6*z01))^(e4*0.0706)) * (((log(H(ii)/(e5*z0)))/(log(Hmet/(e6*z01))))*e2*WS_h_1_min);
    end
    WS_z_ = (e7*e3*(e5*z0/(e6*z01))^(e4*0.0706)) * (((log(0.6*H(end)/(e5*z0)))/(log(Hmet/(e6*z01))))*e2*WS_h_1_min);
% end
end

function [h]=uniform(lb,ub,var)
h=icdf('Uniform',cdf('Normal',var,0,1),lb,ub);
end
