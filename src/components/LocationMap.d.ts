import { FC } from 'react';

interface LocationMapProps {
  onLocationUpdate: (location: { longitude: number; latitude: number }) => void;
  donors?: Array<{
    id: string;
    name: string;
    bloodType: string;
    longitude: number;
    latitude: number;
    distance: number;
  }>;
}

declare const LocationMap: FC<LocationMapProps>;
export default LocationMap; 