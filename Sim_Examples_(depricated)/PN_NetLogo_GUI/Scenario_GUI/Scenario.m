classdef Scenario < handle
    
    properties
        stage
        timestamp
        node
        connectivity
    end
    
    methods
        function obj = Scenario()
        end
        
        function Initialize(obj)
            [obj.nodePN,obj.connectivityPN] = ScenarioSimPN(obj.stage);
            fprintf("Publish Scenario in Initialize")    
        end
        
        function Simulate(obj)
        end
        
        [nodePN,connectivityPN] = ScenarioSimPN(stage);
    end
end