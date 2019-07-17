classdef A_Matlab < handle

    properties
       people = 450
       changeInPeople = 0
    end

    methods
        function obj = A_Matlab()
            obj.people = 450;
            obj.changeInPeople = 0;
        end
        
        function Initialize(obj)
           obj.people = 450;
        end
        
        function Simulate(obj)
            obj.people = obj.people - obj.changeInPeople;
        end
    end
end