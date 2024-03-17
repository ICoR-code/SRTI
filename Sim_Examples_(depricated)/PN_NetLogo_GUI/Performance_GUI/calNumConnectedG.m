
function [NG] = calNumConnectedG(node,connectivity,nodeFcn,linkFcn)
%% Calculate Connectivity Loss (CL)
numG = length(find(node(:,1)==1)) + length(find(node(:,1)==2));
numD = length(find(node(:,1)==3));
% numT = length(nodeType,1)-numG-numD;
NG = zeros(numD,1); % number of generation units able to supply 
                               % flow to each distribution node
survivingLinks = connectivity;

% construct surviving paths
failedLink = find(linkFcn == 1);
survivingLinks(failedLink,:) = [];
failedNode = find(nodeFcn == 1);
for i = 1:size(failedNode,1)
    [row,col] = find(survivingLinks == failedNode(i));
    survivingLinks(row,:) = [];
end

% calculate number of generation units able to supply flow to each 
% distribution node
weights = ones(1,size(survivingLinks,1));
G = digraph(survivingLinks(:,1),survivingLinks(:,2),weights);
for idD = numG+1:numG + numD
    for idG = 1:numG
        if idD <= size(G.Nodes,1)
            %             isOtherShortestPath = true;
            [path,dist] = shortestpath(G,idG,idD);
            %             allShortestPath = path;
            %             while isOtherShortestPath
            if dist <= size(survivingLinks,1)
                NG(idD-numG) = NG(idD-numG)+1;
                %                     % check if there is another shortest path
                %                     linkInPath = zeros(1,floor(dist));
                %                     for i = 1:floor(dist)
                %                         set1 = find(connectivity(:,1) == min(path(i:i+1)));
                %                         set2 = find(connectivity(:,2) == max(path(i:i+1)));
                %                         linkInPath(i) = intersect(set1,set2);
                %                     end
                %                     weights(linkInPath) = 1.01;
                %                     G = digraph(connectivity(:,1),connectivity(:,2),weights);
                %                     [path2,dist2] = shortestpath(G,idG,idD);
                %
                %                     if floor(dist2) == floor(dist) && ~isequal(path2,path)
                %                         for jj = 1:size(allShortestPath,1)
                %                             if isequal(path2,allShortestPath(jj,:))
                %                                 isOtherShortestPath = false;
                %                             end
                %                         end
                %                         path = path2;
                %                         allShortestPath = [allShortestPath;path];
                %                     else
                %                         isOtherShortestPath = false;
                %                     end
                %                 else  % if dist = inf then these two nodes are not connnected
                %                     isOtherShortestPath = false;
            end
            %
            %             end
            
        end
    end
end

end
