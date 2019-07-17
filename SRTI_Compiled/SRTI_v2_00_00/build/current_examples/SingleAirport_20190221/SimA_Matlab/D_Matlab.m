classdef D_Matlab < handle

    properties
       timestamp = 0
       numberOfPeople = 1
    end

    methods
        function obj = D_Matlab()
            obj.timestamp = 0;
            obj.numberOfPeople = 1;
        end
        
        function Initialize(obj)
           
        end
        
        function Simulate(obj)
            if (mod(obj.timestamp, 50) > 50)
                obj.numberOfPeople = mod(obj.timestamp, 9);
            else
                obj.numberOfPeople = mod(obj.timestamp, 5);
            end
        end
    end
end