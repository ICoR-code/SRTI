classdef B_Matlab < handle

    properties
       passengers = 0
       timeToFly = 30
       changeInPeople = 0
    end

    methods
        function obj = B_Matlab()
            obj.passengers = 0;
            obj.timeToFly = 30;
            obj.changeInPeople = 0;
        end
        
        function Initialize(obj)
           obj.passengers = 0;
           obj.timeToFly = 30;
        end
        
        function Simulate(obj)
            obj.passengers = obj.passengers + obj.changeInPeople;
            obj.timeToFly = obj.timeToFly - 1;
        end
    end
end