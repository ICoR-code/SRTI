classdef C_Matlab < handle

    properties
       milesToTravel = 200
       timestamp = 0
    end

    methods
        function obj = C_Matlab()
            obj.milesToTravel = 200;
            obj.timestamp = 0;
        end
        
        function Initialize(obj)
           obj.milesToTravel = (mod(obj.timestamp, 4) + 1) * 50;
        end
        
        function Simulate(obj)
            obj.milesToTravel = obj.milesToTravel - 30;
        end
    end
end