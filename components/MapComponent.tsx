
import React, { useEffect, useRef } from 'react';
import { Coordinates, PlaceOfInterest } from '../types';

interface MapProps {
  mapId: string; // Passed from App.tsx
  currentLocation: Coordinates;
  userLocationAccuracy?: number;
  deviceHeading?: number | null; // Compass Heading
  mapCenter: Coordinates;
  destination: Coordinates | null;
  routePath: Coordinates[];
  directionsResult?: any; // Google Maps DirectionsResult Object
  pois: PlaceOfInterest[];
  activePoi?: PlaceOfInterest | null;
  onMapClick: (coords: Coordinates) => void;
  // New Prop to adjust visual center
  bottomOffset?: number; 
  // Signal to force recenter (e.g. Test Button Click)
  forceRecenter?: number;
  // 🔥 NEW: Map Type Control
  mapType?: 'roadmap' | 'hybrid';
}

// Declare google global
declare const google: any;

const MapComponent: React.FC<MapProps> = ({ 
  mapId,
  currentLocation, 
  userLocationAccuracy = 0,
  deviceHeading = null,
  mapCenter,
  destination, 
  routePath, 
  directionsResult,
  pois,
  activePoi,
  onMapClick,
  bottomOffset = 0,
  forceRecenter = 0,
  mapType = 'roadmap'
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const isAutoFollowRef = useRef(true);
  
  // Markers & Overlays
  const userMarkerRef = useRef<any>(null);
  const userOuterCircleRef = useRef<any>(null); 
  const headingMarkerRef = useRef<any>(null); 
  const accuracyCircleRef = useRef<any>(null);
  const destinationMarkerRef = useRef<any>(null);
  const routePolylineBorderRef = useRef<any>(null);
  const routePolylineMainRef = useRef<any>(null);
  const directionsRendererRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const activePoiPulseRef = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    if (!mapInstanceRef.current && (window as any).google) {
      const map = new google.maps.Map(mapRef.current, {
        center: { lat: mapCenter.lat, lng: mapCenter.lng },
        zoom: 18,
        mapId: mapId, 
        renderingType: 'VECTOR',
        disableDefaultUI: true, 
        clickableIcons: false, 
        gestureHandling: "greedy",
        tilt: 45, 
        heading: 0,
        mapTypeId: mapType,
      });

      map.addListener('click', (e: any) => {
        onMapClick({ lat: e.latLng.lat(), lng: e.latLng.lng() });
      });

      map.addListener('dragstart', () => {
          isAutoFollowRef.current = false;
      });

      directionsRendererRef.current = new google.maps.DirectionsRenderer({
          map: map,
          suppressMarkers: true, 
          suppressPolylines: true, 
          preserveViewport: false, 
      });

      mapInstanceRef.current = map;
    }
  }, []); 

  useEffect(() => {
      if (mapInstanceRef.current) {
          mapInstanceRef.current.setMapTypeId(mapType);
      }
  }, [mapType]);

  useEffect(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setOptions({
          padding: { bottom: bottomOffset, top: 120, left: 0, right: 0 }
      });
      
      if (isAutoFollowRef.current) {
         mapInstanceRef.current.panTo({ lat: currentLocation.lat, lng: currentLocation.lng });
      }
    }
  }, [currentLocation, bottomOffset]);

  useEffect(() => {
     if (forceRecenter > 0 && mapInstanceRef.current) {
         isAutoFollowRef.current = true; 
         mapInstanceRef.current.panTo({ lat: currentLocation.lat, lng: currentLocation.lng });
     }
  }, [forceRecenter, currentLocation]);

  useEffect(() => {
    if (!mapInstanceRef.current) return;

    const VIEW_CONE_PATH = "M 0 0 L -18 -50 L 18 -50 Z"; 
    
    if (deviceHeading !== null) {
        if (!headingMarkerRef.current) {
            headingMarkerRef.current = new google.maps.Marker({
                position: { lat: currentLocation.lat, lng: currentLocation.lng },
                map: mapInstanceRef.current,
                icon: {
                    path: VIEW_CONE_PATH,
                    fillColor: "#4F46E5", // Indigo
                    fillOpacity: 0.2,
                    strokeWeight: 0,
                    rotation: deviceHeading,
                    scale: 1,
                    anchor: new google.maps.Point(0, 0),
                },
                zIndex: 900,
                clickable: false,
            });
        } else {
            headingMarkerRef.current.setPosition({ lat: currentLocation.lat, lng: currentLocation.lng });
            const icon = headingMarkerRef.current.getIcon();
            if (icon) {
                icon.rotation = deviceHeading;
                headingMarkerRef.current.setIcon(icon);
            }
        }
    } else {
        if (headingMarkerRef.current) {
            headingMarkerRef.current.setMap(null);
            headingMarkerRef.current = null;
        }
    }

    const userOuterSymbol = {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: "#ffffff",
        fillOpacity: 1,
        strokeWeight: 0,
    };
    
    const userInnerSymbol = {
      path: google.maps.SymbolPath.CIRCLE,
      scale: 7,
      fillColor: "#4F46E5", // Indigo
      fillOpacity: 1,
      strokeColor: "#ffffff",
      strokeWeight: 2,
    };

    if (!userOuterCircleRef.current) {
        userOuterCircleRef.current = new google.maps.Marker({
            position: { lat: currentLocation.lat, lng: currentLocation.lng },
            map: mapInstanceRef.current,
            icon: userOuterSymbol,
            zIndex: 999,
        });
    } else {
        userOuterCircleRef.current.setPosition({ lat: currentLocation.lat, lng: currentLocation.lng });
    }

    if (!userMarkerRef.current) {
      userMarkerRef.current = new google.maps.Marker({
        position: { lat: currentLocation.lat, lng: currentLocation.lng },
        map: mapInstanceRef.current,
        icon: userInnerSymbol,
        zIndex: 1000,
        title: "You",
        optimized: false, 
      });
    } else {
      userMarkerRef.current.setPosition({ lat: currentLocation.lat, lng: currentLocation.lng });
    }

    if (userLocationAccuracy > 0) {
        if (!accuracyCircleRef.current) {
            accuracyCircleRef.current = new google.maps.Circle({
                strokeColor: "#4F46E5",
                strokeOpacity: 0.15,
                strokeWeight: 1,
                fillColor: "#4F46E5",
                fillOpacity: 0.1,
                map: mapInstanceRef.current,
                center: { lat: currentLocation.lat, lng: currentLocation.lng },
                radius: userLocationAccuracy,
                clickable: false,
                zIndex: 800
            });
        } else {
            accuracyCircleRef.current.setCenter({ lat: currentLocation.lat, lng: currentLocation.lng });
            accuracyCircleRef.current.setRadius(userLocationAccuracy);
        }
    } else {
        if (accuracyCircleRef.current) {
            accuracyCircleRef.current.setMap(null);
            accuracyCircleRef.current = null;
        }
    }

  }, [currentLocation, userLocationAccuracy, deviceHeading]);

  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (destination) {
        if (!destinationMarkerRef.current) {
            destinationMarkerRef.current = new google.maps.Marker({
                position: { lat: destination.lat, lng: destination.lng },
                map: mapInstanceRef.current,
                title: "Destination",
                animation: google.maps.Animation.DROP,
            });
        } else {
            destinationMarkerRef.current.setPosition({ lat: destination.lat, lng: destination.lng });
        }
    } else {
        if (destinationMarkerRef.current) {
            destinationMarkerRef.current.setMap(null);
            destinationMarkerRef.current = null;
        }
    }
  }, [destination]);

  useEffect(() => {
      if (!mapInstanceRef.current) return;

      let path: any[] = [];

      if (directionsResult && directionsResult.routes && directionsResult.routes[0]) {
          path = directionsResult.routes[0].overview_path;
      } else if (routePath.length > 0) {
          path = routePath.map(c => ({ lat: c.lat, lng: c.lng }));
      }

      if (path.length > 0) {
          if (!routePolylineBorderRef.current) {
              routePolylineBorderRef.current = new google.maps.Polyline({
                  path: path,
                  geodesic: true,
                  strokeColor: "#312E81", // Dark Indigo
                  strokeOpacity: 0.8,
                  strokeWeight: 9, 
                  map: mapInstanceRef.current,
                  zIndex: 400
              });
          } else {
              routePolylineBorderRef.current.setPath(path);
              routePolylineBorderRef.current.setMap(mapInstanceRef.current);
          }

          if (!routePolylineMainRef.current) {
              routePolylineMainRef.current = new google.maps.Polyline({
                  path: path,
                  geodesic: true,
                  strokeColor: "#4F46E5", // Primary Indigo
                  strokeOpacity: 1.0,
                  strokeWeight: 6,
                  map: mapInstanceRef.current,
                  zIndex: 401
              });
          } else {
              routePolylineMainRef.current.setPath(path);
              routePolylineMainRef.current.setMap(mapInstanceRef.current);
          }
      } else {
          if (routePolylineBorderRef.current) routePolylineBorderRef.current.setMap(null);
          if (routePolylineMainRef.current) routePolylineMainRef.current.setMap(null);
      }
  }, [directionsResult, routePath]);

  useEffect(() => {
      if (!mapInstanceRef.current) return;

      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];
      
      if (activePoiPulseRef.current) {
          activePoiPulseRef.current.setMap(null);
          activePoiPulseRef.current = null;
      }

      const itemsToRender = [...pois];
      if (activePoi) {
          const exists = itemsToRender.find(p => p.name === activePoi.name);
          if (!exists) {
              itemsToRender.push(activePoi);
          }
      }

      itemsToRender.forEach(poi => {
          const isActive = activePoi && activePoi.name === poi.name;

          let icon;
          let zIndex;
          let animation;

          if (isActive) {
             // 📍 Active Pin: Violet/Fuchsia Gradient style
             const PIN_SVG = "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z";
             
             icon = {
                 path: PIN_SVG,
                 scale: 2.2,
                 fillColor: "#8B5CF6", // Violet 500
                 fillOpacity: 1,
                 strokeColor: "white",
                 strokeWeight: 2,
                 anchor: new google.maps.Point(12, 22), 
             };
             zIndex = 2000;
             animation = google.maps.Animation.BOUNCE;

             activePoiPulseRef.current = new google.maps.Circle({
                  strokeColor: "#8B5CF6",
                  strokeOpacity: 0.8,
                  strokeWeight: 2,
                  fillColor: "#8B5CF6",
                  fillOpacity: 0.2, 
                  map: mapInstanceRef.current,
                  center: { lat: poi.location.lat, lng: poi.location.lng },
                  radius: 40, 
                  clickable: false,
                  zIndex: 1900
              });

          } else {
             // 🟣 Inactive Pin: Small Violet Dot
             icon = {
                 path: google.maps.SymbolPath.CIRCLE,
                 scale: 4.5,
                 fillColor: "#A78BFA", // Violet 400
                 fillOpacity: 0.9,
                 strokeColor: "white",
                 strokeWeight: 2,
             };
             zIndex = 1500;
             animation = null;
          }

          const marker = new google.maps.Marker({
              position: { lat: poi.location.lat, lng: poi.location.lng },
              map: mapInstanceRef.current,
              icon: icon,
              zIndex: zIndex,
              animation: animation,
              title: poi.name
          });

          const infoWindow = new google.maps.InfoWindow({
              content: `
                <div style="padding: 4px 0;">
                    <strong style="font-size: 14px; color: #1e293b; font-family: sans-serif;">${poi.name}</strong>
                </div>
              `,
              disableAutoPan: true
          });

          marker.addListener("click", () => {
              infoWindow.open({
                  anchor: marker,
                  map: mapInstanceRef.current,
                  shouldFocus: false,
              });
          });

          markersRef.current.push(marker);
      });

  }, [pois, activePoi]); 

  return (
    <div ref={mapRef} style={{ width: "100%", height: "100%", zIndex: 0 }} />
  );
};

export default MapComponent;
