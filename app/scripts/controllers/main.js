'use strict';

/**
 * @ngdoc function
 * @name transantiagoScannerApp.controller:MainCtrl
 * @description
 * # MainCtrl
 * Controller of the transantiagoScannerApp
 */
angular.module('transantiagoScannerApp')
  .controller('MainCtrl', function ($scope, $timeout, $http, $templateRequest, $compile, $mdSidenav, $mdToast, $mdMedia, API, uiGmapGoogleMapApi, MapsUtils) {

    var pushBusData = function (plate, date, stopCode, stopIndex, distance, status) {
      if ($scope.busesData[plate] === undefined) {
        $scope.busesData[plate] = {
          date: date,
          positions: [],
          marker: null
        };
      }

      $scope.busesData[plate].positions.push({
        date: date,
        stopCode: stopCode,
        stopIndex: stopIndex,
        distance: parseFloat(distance),
        status: status
      });
    };

    var removeBusMarker = function (busPlate) {
      if ($scope.busesData[busPlate].marker !== null) {
        $scope.busesData[busPlate].marker.setMap(null);
        $scope.busesData[busPlate].marker = null;
      }
    };

    var getBusPositionFromStop = function (stopIndex, distance) {
      var stopPolylineIndex = $scope.busRouteStopMarkers[stopIndex].polylineIndex;

      var targetPosition = null;
      var d = 0.0;
      var positions = $scope.busRouteDirectionPolyline.getPath();

      for (var index = stopPolylineIndex; index >= 1; index -= 1) {
        var pathDistance = google.maps.geometry.spherical.computeDistanceBetween(
          positions.getAt(index),
          positions.getAt(index - 1)
        );

        if (d + pathDistance >= distance) {
          targetPosition = google.maps.geometry.spherical.interpolate(
            positions.getAt(index),
            positions.getAt(index - 1),
            1.0 * (distance - d) / pathDistance
          );
          break;
        } else {
          d += pathDistance;
        }
      }

      return targetPosition;
    };

    var getToastPromise = function () {
      if ($scope.toastPromise === undefined) {
        $scope.toastPromise = $mdToast.show({
          templateUrl: 'views/toast_update.html',
          position: 'bottom right',
          hideDelay: 0,
          scope: $scope.toastScope
        });
      }
      return $scope.toastPromise;
    };

    var updateInfoWindowScope = function (busCode) {
      if ($scope.infoWindow.scope === undefined) {
        $scope.infoWindow.scope = $scope.$new(true);
      }

      $scope.infoWindow.scope = angular.extend($scope.infoWindow.scope, $scope.busesData[busCode]);
      $scope.infoWindow.busCode = busCode;
      $scope.infoWindow.scope.lastUpdate = new Date();
    };

    var openInfoWindow = function () {
      updateInfoWindowScope(this.id);
      $scope.$digest();
      $scope.infoWindow.open($scope.map, this);
    };

    var setBusesMarkers = function () {
      for (var busPlate in $scope.busesData) {
        if ( ! $scope.busesData.hasOwnProperty(busPlate)) {
          return;
        }

        if ($scope.busesData[busPlate].positions.length === 0) {
          removeBusMarker(busPlate);
          continue;
        }

        var markerTemplate = $scope.busMarkerSvgTemplate.replace('{{bus_plate}}', busPlate);
        markerTemplate = markerTemplate.replace('{{bus_color}}', $scope.busRouteColor);

        var polylinePositions = $scope.busRouteDirectionPolyline.getPath().getArray();

        var distancesSum = 0.0;
        for (var index in $scope.busesData[busPlate].positions) {
          var a = $scope.busRouteStopMarkers[$scope.busesData[busPlate].positions[0].stopIndex].polylineIndex;
          var b = $scope.busRouteStopMarkers[$scope.busesData[busPlate].positions[index].stopIndex].polylineIndex;

          var min_ = Math.min(a, b);
          var max_ = Math.max(a, b);

          distancesSum += google.maps.geometry.spherical.computeLength(
            polylinePositions.slice(min_, max_ + 1)
          ) + $scope.busesData[busPlate].positions[index].distance;
        }

        var avgPosition = getBusPositionFromStop(
          $scope.busesData[busPlate].positions[0].stopIndex,
          distancesSum / $scope.busesData[busPlate].positions.length
        );

        if ($scope.busesData[busPlate].marker === null) {
          var marker = new google.maps.Marker({
            map: $scope.map,
            id: busPlate,
            position: avgPosition,
            title: busPlate,
            icon: {
              url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(markerTemplate)
            }
          });
          marker.addListener('click', openInfoWindow);
          $scope.busesData[busPlate].marker = marker;
        } else {
          if ($scope.busesData[busPlate].positions.length > 0) {
            $scope.busesData[busPlate].marker.setPosition(avgPosition);
          } else {
            removeBusMarker(busPlate);
          }
        }

        if (busPlate === $scope.infoWindow.busCode) {
          updateInfoWindowScope(busPlate);
        }
      }

      $mdToast.hide($scope.toastPromise);
      $scope.updateTimeout = $timeout(triggerUpdate, 60 * 1000);

      delete $scope.toastScope;
      delete $scope.toastPromise;
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

      var stopCode = $scope.busRouteStopMarkers[stopIndex].id;

      $http({
        method: 'GET',
        url: sprintf(API.getPrediction, stopCode, $scope.selectedBusRoute)
      }).then(function (response) {
        if (response.data.servicios !== undefined && response.data.servicios.item !== undefined) {
          angular.forEach(response.data.servicios.item, function (serviceItem) {
            if (serviceItem.ppubus1 !== undefined) {
              pushBusData(
                serviceItem.ppubus1,
                date,
                stopCode,
                stopIndex,
                serviceItem.distanciabus1,
                serviceItem.codigorespuesta
              );
            }

            if (serviceItem.ppubus2 !== undefined) {
              pushBusData(
                serviceItem.ppubus2,
                date,
                stopCode,
                stopIndex,
                serviceItem.distanciabus2,
                serviceItem.codigorespuesta
              );
            }
          });
        }
        getStopsInfo(date, stopIndex - 1);
      }, function (response) {
        console.log('getStopData error', response);
        getStopsInfo(date, stopIndex - 1);
      });
    };

    var triggerUpdate = function () {
      if ($scope.busesData === undefined) {
        $scope.busesData = {};
      }

      angular.forEach($scope.busesData, function (busData) {
        busData.positions = [];
      });

      if ($scope.toastScope === undefined) {
        $scope.toastScope = $scope.$new(true);
      }
      $scope.toastScope.text = 'Actualizando buses';
      $scope.toastScope.percentage = 0;

      getToastPromise();
      getStopsInfo(new Date(), $scope.busRouteStopMarkers.length - 1);
    };

    var getBusRouteData = function (busRoute, busDirection) {
      $http({
        method: 'GET',
        url: sprintf(API.getRoute, busRoute)
      }).then(function (response) {
        setBusRoutePolyline(response, busRoute, busDirection);
      }, function (response) {
        console.log('getRouteData error', response);
      });
    };

    var setBusRoutePolyline = function (response, busRouteCode, busDirection) {
      var index = 0;

      if ($scope.busRouteDirectionPolyline !== undefined) {
        $scope.busRouteDirectionPolyline.setMap(null);
        $scope.busRouteDirectionPolyline = undefined;
      }

      if ($scope.busRouteStopMarkers !== undefined) {
        angular.forEach($scope.busRouteStopMarkers, function (stopMarker) {
          stopMarker.setMap(null);
        });

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

      angular.forEach(busRouteData[busDirection].shapes, function (shape) {
        var lat = parseFloat(shape.latShape);
        var lng = parseFloat(shape.lonShape);
        busRoute.polyline.push(new google.maps.LatLng({lat: lat, lng: lng}));

        minLat = Math.min(lat, minLat);
        minLng = Math.min(lng, minLng);
        maxLat = Math.max(lat, maxLat);
        maxLng = Math.max(lng, maxLng);
      });

      angular.forEach(busRouteData[busDirection].paradas, function (stopData) {
        busRoute.stops.push({
          id: stopData.codSimt,
          position: {
            lat: parseFloat(stopData.stop.stopCoordenadaX),
            lng: parseFloat(stopData.stop.stopCoordenadaY)
          },
          title: stopData.codSimt,
          icon: {
            url: '/images/markers/bus_stop_small.png',
            size: new google.maps.Size(10, 11)
          }
        });          
      });

      var latestIndex = 0;

      angular.forEach(busRoute.stops, function (stop) {
        var projectionPosition = MapsUtils.getClosestPointsProjection(
          $scope.map,
          busRoute.polyline,
          new google.maps.LatLng(stop.position),
          latestIndex
        );

        if (projectionPosition !== null && projectionPosition[0] !== -1) {
          stop.valid = true;
          stop.polylineIndex = projectionPosition[0] + 1;
          busRoute.polyline.splice(projectionPosition[0] + 1, 0, new google.maps.LatLng(stop.position));
          latestIndex = projectionPosition[0];
        } else {
          stop.valid = false;
          console.log('Projection not found for stop', stop.title);
        }
      });

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

        // options.map = $scope.map;

        options.index = index;
        options.title = options.title;
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

    $scope.toggleSidenav = function () {
      $mdSidenav('left').toggle();
    };

    $scope.setBusRoute = function (busRoute, busDirection) {
      if (busRoute === $scope.selectedBusRoute && busDirection === $scope.selectedBusRouteDirection) {
        return;
      }

      // busRoute = 'H05';

      if ($scope.updateTimeout !== undefined) {
        $timeout.cancel($scope.updateTimeout);
      }

      for (var busPlate in $scope.busesData) {
        if ($scope.busesData.hasOwnProperty(busPlate)) {
          removeBusMarker(busPlate);
        }
      }
      $scope.busesData = {};

      if ($scope.toastScope === undefined) {
        $scope.toastScope = $scope.$new(true);
      }
      $scope.toastScope.text = 'Obteniendo ruta';
      $scope.toastScope.percentage = 0;

      if ( ! $mdMedia('gt-sm')) {
        getToastPromise();
        $mdSidenav('left').toggle().then(function () {
          getBusRouteData(busRoute, busDirection);
        });
      } else {
        getBusRouteData(busRoute, busDirection);
      }
    };

    var loadTemplates = function () {
      // Get bus markers SVG
      $templateRequest('images/markers/marker_bus.svg').then(function (template) {
        $scope.busMarkerSvgTemplate = template;
      }, function () {
        console.log('getBusMarkerSvg error');
      });

      // InfoWindow template
      $templateRequest('views/infowindow_bus.html').then(function (template) {
        $scope.busMarkerInfoWindowTemplate = template;
      }, function () {
        console.log('getBusMarkerInfoWindowTemplate error');
      });
    };

    var loadMap = function () {
      uiGmapGoogleMapApi.then(function () {
        $scope.infoWindow = new google.maps.InfoWindow();
        $scope.infoWindow.forceUpdate = new Date();

        $scope.$watch('infoWindow.scope.lastUpdate', function () {
          if ($scope.infoWindow.scope !== undefined) {
            var contents = $compile($scope.busMarkerInfoWindowTemplate)($scope.infoWindow.scope);
            $scope.infoWindow.setContent(contents[0]);
          }
        });

        $scope.map = new google.maps.Map(document.getElementById('google_map_container'), {
          center: {lat: -33.48, lng: -70.65},
          zoom: 11,
          mapTypeId: google.maps.MapTypeId.ROADMAP,
          disableDefaultUI: true,
          rotateControl: false,
          streetViewControl: false
        });
      });
    };

    $scope.$mdMedia = $mdMedia;

    loadTemplates();
    loadMap();
  });
