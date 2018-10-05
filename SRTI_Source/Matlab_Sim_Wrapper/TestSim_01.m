classdef TestSim_01 < handle

    properties
       x = 0
       y = 0
    end

    methods
        function obj = TestSim_01()
            obj.x = 0;
            obj.y = 0;
        end
        
        
        function Initialize(obj)
           obj.x = 1;
           obj.y = 5;
        end
        
        function SimulateStep(obj)
            obj.x = obj.x + 1;
            obj.y = obj.y + 2;
        end
    end
end