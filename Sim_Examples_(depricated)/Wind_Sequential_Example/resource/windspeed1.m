function [V,t,dt]=windspeed1(z,WS,V10,zsize,z0)
% Generate wind speed at each floor
rnd_var=2048*zsize;       % number of random variables N*20

% % White noise
theta=randn(1,rnd_var);
% 
% % Rosenblatt transformation
% theta_3=uniform(0,2*pi,theta);
% % THETA=[theta_2 theta_3];

% Parameters
% z0=0.02;           % mean site roughness
phi=uniform(0,2*pi,theta);       % random phase uniformly distributed [0 2pi]

% Wind
[V,t,dt]=wind(z,z0,phi,WS,V10);
% [F] = windload(V,1.3,A);
% Retrieve the required part

end

function [h]=uniform(lb,ub,var)
%funzione che partendo da una variabile gaussiana normalizzata ne calcola
%dapprima il valore nella cumulta e poi attraverso l'inverso
%della cumultata (icdf) trova il corrispondente valore nella distribuzione
%uniforme con bounds lb e ub
h=icdf('Uniform',cdf('Normal',var,0,1),lb,ub);
end

%% GENERATION OF WIND SPEED
function [V,t,dt]=wind(z,z0,white1,WS,V10)
e5=1;
% z=20:12.5:507.5;                % Heights
% z=z/3.28;
zsize=size(z,2);                % Number of variation
story_h=zeros(1,zsize);         % story height
story_h(1)=z(1);
for i=2:zsize
    story_h(i)=z(i)-z(i-1);
end
% % rho=1.25;                       % air density [kg/m^3]
% % Cd=1.3;                         % drag coefficient
% % %A=story_h*40/3.28;              % impact area
% % gamma=0.5*rho*Cd*A;             % coefficient
%change
N=2048;                           % sampling points - why 2048?  
nt=2*N;                         % double sampling points [M in deodatis]
fc=4/(2*pi);                    % cut-off frequency [Hz]

wc=2*pi*fc;                     % cut-off frequency [rad/sec]
dwc=wc/N;                       % frequency interval [rad/sec]
% dwc=dwc/2/pi;
dt=(2*pi)/(nt*dwc);             % time interval [sec] considering the sampling theorem
% dt=(nt*dwc);             % time interval [sec] considering the sampling theorem
k=0.4;                          % von Karman's constant
beta=0.65;                       % factor for power law
% alpha=1/6.5;                    % exponent of power law (ground roughness degree)
Cz=10;                          % coefficient for coherence function, 10
%T0=(2*pi*zsize)/dwc;           % period of the signal
%n=(dwc/zsize):(dwc/zsize):wc;  % frequency range, n(zsize)=dwc from Deodatis
%fsize=size(n,2);               % size of the frequency vector
nc1=sum(1:zsize);
nc=zsize^2-nc1;                 % total number of upper triangle matrix components
n1=dwc:dwc:wc;                  % frequency vector
% n2=dwc:dwc:wc/2/pi;                  % frequency vector
% n1=n1./2/pi;
n2=n1./2/pi;
t=dt:dt:zsize*N/fc;             % time vector

% Calculate wind speeds and friction velocity according to heights
% [WS,WS_H,V10,e5] = generateWSvector(Nsim,z,zsize,z0);
% WS_H(mc)=WS_H;
fricV = V10 .* beta * k ./ log(10./(e5*z0));   % Friction velocity u*
% set matrices
%G=zeros(zsize,zsize);

% % F=[];
% F=zeros(zsize*nt,zsize*Nsim);
% for n=1:Nsim
%     VV=WS(:,n)';
    VV=WS';
    G1=zeros(zsize,zsize);
    H1=zeros(N,zsize);
    H2=zeros(N,nc);
    B1=zeros(nt,nc1);
%     Fn=zeros(zsize*nt,zsize);
    Sv=zeros(1,N);
for jj=1:N
% Calculate diagonal terms of the PSD matrix
G=diag(1 ./2 .*200 ./2 ./pi .*fricV^2 .*z ./VV ./((1+50 .*n1(jj) .*z ./2 ./pi ./VV) .^(5/3)));  % 121806
Gf=diag(1 ./2 .*200 .*fricV^2 .*z ./VV ./((1+50 .*n2(jj) .*z ./VV) .^(5/3)));  % 121806
Sv(jj)=Gf(zsize,zsize);
% Calculate off-diagonal terms of the PSD matrix
k=1;
for ii=1:zsize 
    for jjj=(ii+1):zsize
        G(ii,jjj) = sqrt(G(ii,ii)*G(jjj,jjj))*exp(-Cz*n1(jj) / (2*pi) * (abs(z(ii)-z(jjj))) / (0.5*(VV(ii)+VV(jjj))))*0.9999999;
        G1(ii,jjj) = exp(-Cz*n1(jj) / (2*pi) * (abs(z(ii)-z(jjj))) / (0.5*(VV(ii)+VV(jjj))));
%         G(ii,jjj) = sqrt(G(ii,ii)*G(jjj,jjj))*exp(-Cz*n1(jj) * (abs(z(ii)-z(jjj))) / (0.5*(VV(ii)+VV(jjj))))*0.9999999;
%         G1(ii,jjj) = exp(-Cz*n1(jj) * (abs(z(ii)-z(jjj))) / (0.5*(VV(ii)+VV(jjj))));
        k=k+1;
    end
end
G=G'+G-diag(diag(G));
% Cholesky decomposition
dummy_m=chol(G);
H1(jj,:)=diag(dummy_m)';
dummy_m1=triu(dummy_m,1);
k1=1;
for i1=1:zsize
  for j1=(i1+1):zsize
        H2(jj,k1)=dummy_m1(i1,j1);
        k1=k1+1;
  end
end
end
%rand('state',sum(100*clock));
%rand('state',0);
%white1=rand(zsize,N)*2*pi;          
white1=reshape(white1,N,[]);
white1=white1';
% Generation of sample function  of the simulated stochastic vector
% Ding_Zhu_Xiang_Simulation of stationary gaussian stochastic wind velocity
% field_ Wind and Structures
%%% diagonal terms
for jj=1:zsize     
B1(1:N,jj)=2.*abs(interp1(n1',H1(:,jj),(0:N-1).*dwc+jj/zsize*dwc,'linear','extrap')')...
    .*sqrt(dwc).*exp(1i*white1(jj,:)');            
end
%%% off-diagonal terms
jjj=zsize+1;
  for m=1:zsize
    for jj=(m+1):zsize
            B1(1:N,jjj)=2.*abs(interp1(n1',H2(:,jjj-zsize),(0:N-1).*dwc+m/zsize*dwc,'linear','extrap')')...
                .*sqrt(dwc).*exp(1i*white1(m,:)');                        
    jjj=jjj+1;
    end
  end
for m=1:nc1
    B1(:,m)=ifft(B1(:,m))*nt;
end
% set matrices
%outg1=zeros(zsize*nt,1);
%outg2=zeros(zsize*nt,1);
outgogo=zeros(zsize*nt,zsize);
%p=zeros(1,nt);
kkk=(0:1:zsize);
kk=0;
for ii=zsize:-1:1
outg1=0;
outg2=0;
    for jj=ii:-1:1
        iii=1;
        jj1=jj-1;
        if (jj1 == 0) 
            jj1=ii; 
        end
        while iii<=zsize
            p=(kkk(iii)*nt+1):(kkk(iii+1)*nt);
            outg2(p,1)=real(B1(p-kkk(iii)*nt,jj*zsize-sum(1:jj-1)-kk)).*cos(jj1.*dwc./zsize.*p.*dt)'...
                -imag(B1(p-kkk(iii)*nt,jj*zsize-sum(1:jj-1)-kk)).*sin(jj1.*dwc./zsize.*p.*dt)';
            iii=iii+1;
        end
        outg1=outg1+outg2;
    end
outgogo(:,ii)=outg1;
kk=kk+1;
end
% Forcing function
V1=repmat(VV,size(outgogo,1),1);
%V=(V1+outgogo).^2;
V=(V1.^2+2*V1.*outgogo);% trascuro il termine quadratico outgogo.^2

%%%% 
V = V.^0.5;  %m/s
% % Fn=V*diag(gamma');
% % F=[F,Fn];
% % % end
% % F=F'./1000;  %[kN]
% % 
% % F=F(:,1:5120)';
% % t=t(1:5120)';

% % PSD----------------------------------------------------------------------
% m=mean(F');
% Fz=F;
% % zero mean
% for i=1:zsize
%     Fz(i,:)=Fz(i,:)-m(i);
% end
% 
% fs = 1/t(1); % sampling frequency
% N      = length(F(:,zsize)); 
% [SY_h,f_h] = cpsd(Fz(:,zsize),Fz(:,zsize),hanning(N/16),N/32,N/4,fs); 
% 
% 
% SF_t=(2*gamma(zsize)*VV(zsize)).^2*Sv/1000^2;
% 
% 
% set(figure,'Position',[300 300 1000 200]);
% plot(t,F(:,zsize));
% xlim([0 max(t)]);
% xlabel('t(s)');
% ylabel('F_{top} (kN)');
% 
% figure
% loglog(f_h,SY_h,'-b');
% hold on;
% loglog(n2,2*SF_t,'--r','LineWidth',1.5);
% legend('Simulated','Target');
% xlabel('f(Hz)','FontSize',14);
% ylabel('S_{F_{top}} (kN^2/Hz)','FontSize',14);
end
