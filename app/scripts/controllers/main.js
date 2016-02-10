'use strict';

var GOOGLE_MAPS_STYLES = [
  {
    'featureType': 'road.highway',
    'stylers': [{'color': '#ffffff'}]
  },
  {
    'featureType': 'road.highway',
    'elementType': 'labels.text',
    'stylers': [{'color': '#000000'}, {'weight': 0.1}]
  },
  {
    'featureType': 'road.arterial',
    'stylers': [{'color': '#ffffff'}]
  },
  {
    'featureType': 'road.arterial',
    'elementType': 'labels.text',
    'stylers': [{'color': '#000000'}, {'weight': 0.1}]
  },
  {
    'featureType': 'road.local',
    'stylers': [{'color': '#ffffff'}]
  },
  {
    'featureType': 'road.local',
    'elementType': 'labels.text',
    'stylers': [{'color': '#000000'}, {'weight': 0.1}]
  },
  {
    'featureType': 'landscape.natural',
    'elementType': 'geometry.fill',
    'stylers': [{'color': '#ebead5'}]
  },
  {
    'featureType': 'transit.station.bus',
    'stylers': [{'visibility': 'off'}]
  },
  {
    'featureType': 'landscape.natural.terrain'
  },
  {
    'featureType': 'poi',
    'elementType': 'labels.text.fill',
    'stylers': [{'color': '#E47903'}]
  },
  {
    'featureType': 'transit.station.rail',
    'elementType': 'labels.text.fill',
    'stylers': [{'color': '#FF0000'}, {'visibility': 'on'}]
  },
  {
    'featureType': 'transit.station.rail',
    'elementType': 'labels.icon',
    'stylers': [{'hue': '#CC0000'}]
  }
];


// http://stackoverflow.com/questions/1502590/calculate-distance-between-two-points-in-google-maps-v3
var rad = function (x) {
  return x * Math.PI / 180;
};

var getDistance = function (p1, p2) {
  var R = 6378137; // Earth’s mean radius in meter
  var dLat = rad(p2.lat() - p1.lat());
  var dLong = rad(p2.lng() - p1.lng());
  var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(rad(p1.lat())) * Math.cos(rad(p2.lat())) *
    Math.sin(dLong / 2) * Math.sin(dLong / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  var d = R * c;
  return d; // returns the distance in meter
};

var getMiddlePosition = function (latLngA, latLngB) {
  return new google.maps.LatLng((latLngA.lat() + latLngB.lat()) / 2, (latLngA.lng() + latLngB.lng()) / 2);
};

var getProjectionLatLng = function (projection, latLngA, latLngB, latLngP) {
  var pointA = projection.fromLatLngToPoint(latLngA);
  var pointB = projection.fromLatLngToPoint(latLngB);
  var pointP = projection.fromLatLngToPoint(latLngP);

  var m1 = 1.0 * (pointB.y - pointA.y) / (pointB.x - pointA.x);
  var m2 = -1.0 / m1;

  var x = (pointP.y - m2 * pointP.x - pointA.y + m1 * pointA.x) / (m1 - m2);
  var y = m1 * (x - pointA.x) + pointA.y;

  return projection.fromPointToLatLng(new google.maps.Point(x, y));
};

var getClosestPointsProjection = function (map, positions, latLng, startIndex) {
  var projection = map.getProjection();

  var minHeight = Number.MAX_SAFE_INTEGER;
  var foundIndex = -1;
  var foundPosition = null;

  for (var i = startIndex; i < positions.length - 1; i++) {
    var projectionLatLng = getProjectionLatLng(projection, positions[i], positions[i + 1], latLng);

    var middlePoint = getMiddlePosition(positions[i], positions[i + 1]);

    var radius = getDistance(positions[i], middlePoint);
    var distance = getDistance(middlePoint, latLng);

    var height = getDistance(projectionLatLng, latLng);

    if (distance <= 1.2 * radius && height < minHeight) {
      minHeight = height;
      foundIndex = i;
      foundPosition = projectionLatLng;
    }
  }

  return [foundIndex, foundPosition];
};


/**
 * @ngdoc function
 * @name transantiagoScannerApp.controller:MainCtrl
 * @description
 * # MainCtrl
 * Controller of the transantiagoScannerApp
 */
angular.module('transantiagoScannerApp')
  .controller('MainCtrl', function ($scope, $timeout, $http, $mdSidenav, $mdToast, $mdMedia, API, uiGmapGoogleMapApi) {
    var buildToggler = function (navId) {
      return function () {
        $mdSidenav(navId)
          .toggle()
          .then(function () {
            console.log('toggle ' + navId + ' is done');
          });
      };
    };

    var pushBusData = function (plate, date, stopIndex, distance) {
      if ($scope.busesData[plate] === undefined) {
        $scope.busesData[plate] = {
          date: date,
          distances: [],
          marker: null
        };
      }

      $scope.busesData[plate].distances.push({
        date: date,
        stopIndex: stopIndex,
        distance: parseFloat(distance)
      });
    };

    var removeBusMarker = function (busPlate) {
      if ($scope.busesData[busPlate].marker !== null) {
        $scope.busesData[busPlate].marker.setMap(null);
        $scope.busesData[busPlate].marker = null;
      }
    };

    var getBusPositionFromStop = function (busPlate) {
      var lastDistanceIndex = $scope.busesData[busPlate].distances.length - 1;

      var stopIndex = $scope.busesData[busPlate].distances[lastDistanceIndex].stopIndex;
      var totalDistance = $scope.busesData[busPlate].distances[lastDistanceIndex].distance;
      var stopPolylineIndex = $scope.busRouteStopMarkers[stopIndex].polylineIndex;

      var targetPosition = null;
      var distance = 0.0;
      var positions = $scope.busRouteDirectionPolyline.getPath();

      for (var index = stopPolylineIndex; index >= 1; index--) {
        var pathDistance = google.maps.geometry.spherical.computeDistanceBetween(
          positions.getAt(index),
          positions.getAt(index - 1)
        );

        if (distance + pathDistance >= totalDistance) {
          targetPosition = google.maps.geometry.spherical.interpolate(
            positions.getAt(index),
            positions.getAt(index - 1),
            1.0 * (totalDistance - distance) / pathDistance
          );
          break;
        } else {
          distance += pathDistance;
        }
      }

      return [targetPosition, $scope.busesData[busPlate].distances[lastDistanceIndex].stopIndex, totalDistance];
    };

    var setBusesMarkers = function () {
      for (var busPlate in $scope.busesData) {
        if ($scope.busesData[busPlate].distances.length === 0) {
          removeBusMarker(busPlate);
          continue;
        }

        var position = getBusPositionFromStop(busPlate);
        var markerTemplate = $scope.busMarkerSvgTemplate.replace('{{bus_plate}}', busPlate);
        markerTemplate = markerTemplate.replace('{{bus_color}}', $scope.busRouteColor);

        if ($scope.busesData[busPlate].marker === null) {
          $scope.busesData[busPlate].marker = new google.maps.Marker({
            map: $scope.map,
            id: busPlate,
            position: position[0],
            title: busPlate + ' ' + position[1] + ' ' + position[2],
            icon: {
              url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(markerTemplate)
            }
          });
        } else {
          if ($scope.busesData[busPlate].distances.length > 0) { 
            $scope.busesData[busPlate].marker.setPosition(position[0]);
            $scope.busesData[busPlate].marker.title = busPlate + ' ' + position[1] + ' ' + position[2];
          } else {
            removeBusMarker(busPlate);
          }
        }
      }

      $mdToast.hide($scope.updateToastPromise);
      $scope.updateTimeout = $timeout(triggerUpdate, 60 * 1000);
    };

    var getStopsInfo = function (date, stopIndex) {
      if (stopIndex < 0) {
        setBusesMarkers();
        return;
      }

      var percentage = parseInt(100.0 * ($scope.busRouteStopMarkers.length - stopIndex - 1) / ($scope.busRouteStopMarkers.length - 1));
      $scope.toastScope.percentage = percentage;

      if ( ! $scope.busRouteStopMarkers[stopIndex].valid) {
        getStopsInfo(date, stopIndex - 1);
        return;
      }

      $http({
        method: 'GET',
        url: sprintf(API.getPrediction, $scope.busRouteStopMarkers[stopIndex].id, $scope.selectedBusRoute)
      }).then(function (response) {
        if (response.data.servicios !== undefined && response.data.servicios.item !== undefined) {
          for (var index in response.data.servicios.item) {
            if (response.data.servicios.item[index].ppubus1 !== undefined) {
              pushBusData(
                response.data.servicios.item[index].ppubus1,
                date,
                stopIndex,
                response.data.servicios.item[index].distanciabus1
              );
            }

            if (response.data.servicios.item[index].ppubus2 !== undefined) {
              pushBusData(
                response.data.servicios.item[index].ppubus2,
                date,
                stopIndex,
                response.data.servicios.item[index].distanciabus2
              );
            }
          }
        }
        getStopsInfo(date, stopIndex - 1);
      }, function (response) {
        console.log('getStopData error', response);
        getStopsInfo(date, stopIndex - 1);
      });
    };

    var triggerUpdate = function () {
      $scope.toastScope = $scope.$new(true);
      $scope.toastScope.percentage = 0;

      $scope.updateToastPromise = $mdToast.show({
        templateUrl: 'views/toast_update.html',
        position: 'bottom right',
        hideDelay: 0,
        scope: $scope.toastScope
      });

      if ($scope.busesData === undefined) {
        $scope.busesData = {};
      }

      for (var busPlate in $scope.busesData) {
        $scope.busesData[busPlate].distances = [];
      }

      getStopsInfo(new Date(), $scope.busRouteStopMarkers.length - 1);
    };

    $scope.setBusRoutePolyline = function (response, busRouteCode, busDirection) {
      var index = 0;

      if ($scope.busRouteDirectionPolyline !== undefined) {
        $scope.busRouteDirectionPolyline.setMap(null);
        $scope.busRouteDirectionPolyline = undefined;
      }

      if ($scope.busRouteStopMarkers !== undefined) {
        for (index in $scope.busRouteStopMarkers) {
          $scope.busRouteStopMarkers[index].setMap(null);
        }

        $scope.busRouteDirectionEdges = undefined;
        $scope.busRouteStopMarkers = undefined;
      }

      var busRouteData = response.data;

      var busRoute = {
        polyline: [],
        stops: []
      };

      var minLat = Number.POSITIVE_INFINITY;
      var minLng = Number.POSITIVE_INFINITY;
      var maxLat = Number.NEGATIVE_INFINITY;
      var maxLng = Number.NEGATIVE_INFINITY;

      for (var i in busRouteData[busDirection].shapes) {
        var lat = parseFloat(busRouteData[busDirection].shapes[i].latShape);
        var lng = parseFloat(busRouteData[busDirection].shapes[i].lonShape);
        busRoute.polyline.push(new google.maps.LatLng({lat: lat, lng: lng}));

        minLat = Math.min(lat, minLat);
        minLng = Math.min(lng, minLng);
        maxLat = Math.max(lat, maxLat);
        maxLng = Math.max(lng, maxLng);
      }

      for (i in busRouteData[busDirection].paradas) {
        busRoute.stops.push({
          id: busRouteData[busDirection].paradas[i].codSimt,
          position: {
            lat: parseFloat(busRouteData[busDirection].paradas[i].stop.stopCoordenadaX),
            lng: parseFloat(busRouteData[busDirection].paradas[i].stop.stopCoordenadaY)
          },
          title: busRouteData[busDirection].paradas[i].codSimt,
          icon: {
            url: '/images/markers/bus_stop_small.png',
            size: new google.maps.Size(10, 11)
          }
        });          
      }

      var latestIndex = 0;

      for (index in busRoute.stops) {
        var projectionPosition = getClosestPointsProjection(
          $scope.map,
          busRoute.polyline,
          new google.maps.LatLng(busRoute.stops[index].position),
          latestIndex
        );

        if (projectionPosition !== null && projectionPosition[0] !== -1) {
          busRoute.stops[index].valid = true;
          busRoute.stops[index].polylineIndex = projectionPosition[0] + 1;
          busRoute.polyline.splice(projectionPosition[0] + 1, 0, new google.maps.LatLng(busRoute.stops[index].position));
          latestIndex = projectionPosition[0];
        } else {
          busRoute.stops[index].valid = false;
          console.log('Projection not found for stop', busRoute.stops[index].title);
        }
      }

      $scope.busRouteColor = busRouteData[busDirection].color;

      $scope.busRouteDirectionPolyline = new google.maps.Polyline({
        path: busRoute.polyline,
        strokeColor: $scope.busRouteColor,
        strokeOpacity: 1.0,
        strokeWeight: 3,
        clickable: false,
        draggable: false,
        editable: false,
      });

      $scope.busRouteDirectionPolyline.setMap($scope.map);

      var options = {};
      var marker = null;

      $scope.busRouteStopMarkers = [];
      for (index in busRoute.stops) {
        options = busRoute.stops[index];

        if ($mdMedia('gt-sm')) {
          options.map = $scope.map;
        }

        options.index = index;
        options.title = index + ' - ' + options.title;
        options.opacity = 0.4;

        marker = new google.maps.Marker(options);
        $scope.busRouteStopMarkers.push(marker);
      }

      $scope.selectedBusRoute = busRouteCode;
      $scope.selectedBusRouteDirection = busDirection;
      $scope.selectedBusRouteDirectionFrom = busRouteData[busDirection].destino;
      $scope.selectedBusRouteDirectionTo = busRouteData[Math.abs(busDirection - 1)].destino;
      if ($scope.selectedBusRouteDirectionName !== undefined) {
        $scope.selectedBusRouteDirectionName = $scope.selectedBusRouteDirectionName.trim();
      }

      var routeBounds = new google.maps.LatLngBounds(
        new google.maps.LatLng(minLat, minLng),
        new google.maps.LatLng(maxLat, maxLng)
      );
      $scope.map.fitBounds(routeBounds);

      triggerUpdate();
    };

    $scope.setBusRoute = function (busRoute, busDirection) {
      if (busRoute === $scope.selectedBusRoute && busDirection === $scope.selectedBusRouteDirection) {
        return;
      }

      if ( ! $mdMedia('gt-sm')) {
        $scope.toggleSidenav();
      }

      // busRoute = 'H05';

      if ($scope.updateTimeout !== undefined) {
        $timeout.cancel($scope.updateTimeout);
      }

      for (var busPlate in $scope.busesData) {
        removeBusMarker(busPlate);
      }
      $scope.busesData = {};

      $http({
        method: 'GET',
        url: sprintf(API.getRoute, busRoute)
      }).then(function (response) {
        $scope.setBusRoutePolyline(response, busRoute, busDirection);
      }, function (response) {
        console.log('getRouteData error', response);
      });
    };

    $scope.setGroup = function (group) {
      $scope.selectedGroup = group.name;
    };

    $scope.groups = [
      {name: '1', color: '#000000', textColor: '#FFFFFF'},
      {name: '2', color: '#000000', textColor: '#FFFFFF'},
      {name: '3', color: '#000000', textColor: '#FFFFFF'},
      {name: '4', color: '#000000', textColor: '#FFFFFF'},
      {name: '5', color: '#000000', textColor: '#FFFFFF'},
      {name: 'B', color: '#000000', textColor: '#FFFFFF'},
      {name: 'C', color: '#000000', textColor: '#FFFFFF'},
      {name: 'D', color: '#000000', textColor: '#FFFFFF'},
      {name: 'E', color: '#000000', textColor: '#FFFFFF'},
      {name: 'F', color: '#000000', textColor: '#FFFFFF'},
      {name: 'G', color: '#000000', textColor: '#FFFFFF'},
      {name: 'H', color: '#000000', textColor: '#FFFFFF'},
      {name: 'I', color: '#000000', textColor: '#FFFFFF'},
      {name: 'J', color: '#000000', textColor: '#FFFFFF'}
    ];

    $scope.toggleSidenav = buildToggler('left');
    $scope.selectedGroup = '1';

    $http({
      method: 'GET',
      url: '/images/markers/marker_bus.svg'
    }).then(function (response) {
      $scope.busMarkerSvgTemplate = response.data;
    }, function (response) {
      console.log('getBusMarkerSvg error', response);
    });

    uiGmapGoogleMapApi.then(function () {
      $scope.map = new google.maps.Map(document.getElementById('google_map_container'), {
        center: {lat: -33.48, lng: -70.65},
        zoom: 11,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        styles: GOOGLE_MAPS_STYLES
      });
    });
  });
