function [Disp,Qn_former]=ModalAnalysisCDM(M,K,dt,alpha,beta,xi,nfloor,P0,P1,Qn_former)
% n = number of stories
% m =  mass of each story
% k = stiffness of each story
% xi = damping ratios
% dt = time step for loads
% Disp = Displacement
% Qn_former = initial condition for modal anay
% M(nxn) K(nxn)

% ----- Modal Analysis -----
[modes,om2] = eig(K,M);                 % mode shape
OM = diag(om2.^(0.5));
% xi = alpha/2./OM + beta/2.*OM;
% OMd = OM*sqrt(1-xi^2);
modes = modes/sqrt(modes'*M*modes);     % mass normalized
Mn = diag(modes'*M*modes);              % Mn = 1
Kn = diag(modes'*K*modes);              % Kn = om2*Mn = om2
Cn = 2*xi*Mn.*OM;
% C = alpha*M + beta*K;
% Cn = diag(modes'*C*modes);
Qn = zeros(nfloor,1);
% load Disp_Load Qn_former
% ----- Central difference method -----
            for j = 1:nfloor       % j-th mode
                nn = floor(dt/(1/OM(j)/10));
                ddt = dt/nn;
                ud = zeros(nn+2,1);
                ud(1) = Qn_former(j,1);  % Qu_former1(j,ii-2)
                ud(2) = Qn_former(j,2);  % Qu_former2(j,ii-1)
                for i = 1:nn
                    P = P0+(P1-P0)/nn*i;%
                    Pn = real(modes'*P);
                    ud(i+2) = (Pn(j)+ (2*Mn(j)/ddt^2-Kn(j))*ud(i+1)...
                        + (-Mn(j)/ddt^2+Cn(j)/2/ddt)*ud(i)) / (Mn(j)/ddt^2 + Cn(j)/2/ddt);
                end
                Qn(j) = real(ud(end));
                Qn_former(j,1:2) = real(ud(end-1:end));
            end
            Disp = real(modes*Qn);
%             save Disp_Load Qn_former -append
%             eval(sprintf('save Disp_Load Qn_former_%d  -append',nb));
end



