
function [resourcePN,resourceWN,resourceGN] = allocateResource(CLPN,CLWN,CLGN)
totalResource = 45; 
totalCL = CLPN+CLWN+CLGN;
if totalCL > 0
    proportion = [CLPN/totalCL,CLWN/totalCL,CLGN/totalCL];  % [PN,WN,GN]
else
    proportion = [0,0,0];
end
% proportion = [5/15,5/15,5/15];
resourcePN = totalResource*proportion(1);
resourceWN = totalResource*proportion(2);
resourceGN = totalResource*proportion(3);

end