classdef DirectDamagePN < handle
    
    properties
        % input variables
        stage
        timestamp
        nodePN
        connectivityPN
        gaPN
        gvPN
        rec_nodeDSPN
        rec_linkDSPN
        % output variables
        nodeDSPN
        linkDSPN
        nodeFcnPN
        linkFcnPN

    end
    
    methods
        function obj = DirectDamagePN()
        end
        
        function Initialize(obj)
        end
        
        function Simulate_0(obj)
            [obj.nodeDSPN,obj.linkDSPN] = calSeismicDamagePN_0(obj.nodePN,obj.connectivityPN,obj.nodeDSPN,obj.linkDSPN,obj.gaPN,obj.gvPN);
            [obj.nodeFcnPN,obj.linkFcnPN] = calFcnPN(obj.nodeDSPN,obj.linkDSPN);
            fprintf(['Publish stage 0, DDamagePN: step ',num2str(obj.timestamp),'\n'])
        end
        
%         function Simulate_2(obj)
%             if obj.timestamp <= 1
%                 reduce_capacity(obj.nodeDSPN,obj.linkDSPN)
%             end
%             [obj.nodeDSPN,obj.linkDSPN] = calSeismicDamagePN_2(obj.nodePN,obj.connectivityPN,obj.nodeDSPN,obj.linkDSPN,obj.gaPN,obj.gvPN);
%             fprintf(['Publish stage 2, DDamagePN: step ',num2str(obj.timestamp),'\n'])
%         end
        
        function Update(obj)
            obj.nodeDSPN = obj.rec_nodeDSPN;
            obj.linkDSPN = obj.rec_linkDSPN;
            [obj.nodeFcnPN,obj.linkFcnPN] = calFcnPN(obj.nodeDSPN,obj.linkDSPN);
            fprintf(['Update DDamagePN: stage ',num2str(obj.stage),', step ',num2str(obj.timestamp),'\n'])
        end
        [nodeDS,linkDS] = calSeismicDamagePN_0(node,connectivity,nodeDS,linkDS,ga,gv)
%         [nodeDS,linkDS] = calSeismicDamagePN_2(node,connectivity,nodeDS,linkDS,ga,gv)
%         reduce_capacity(nodeDS,linkDS)
    end
end