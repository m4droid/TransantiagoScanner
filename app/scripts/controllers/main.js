'use strict';

/**
 * @ngdoc function
 * @name transantiagoScannerApp.controller:MainCtrl
 * @description
 * # MainCtrl
 * Controller of the transantiagoScannerApp
 */
angular.module('transantiagoScannerApp')
  .controller('MainCtrl', function ($scope, $window, $timeout, $http, $templateRequest, $compile, $mdSidenav, $mdToast, $mdMedia, API, MapsUtils, localStorageService) {

    var resetClosestStops = function () {
      if (Object.keys($scope.closestStops).length > 0) {
        angular.forEach($scope.closestStops, function (stopMarker, stop) {
          $scope.closestStops[stop].remove();
        });

        $scope.closestStops = {};
      }
    }

    var resetServicesData = function () {
      if (Object.keys($scope.servicesData).length > 0) {
        angular.forEach($scope.servicesData, function (serviceData, serviceCode) {
          if ($scope.servicesData[serviceCode].polyline !== undefined) {
            $scope.servicesData[serviceCode].polyline.remove();
          }

          if ($scope.servicesData[serviceCode].buses !== undefined) {
            angular.forEach($scope.servicesData[serviceCode].buses, function (bus) {
              if (bus.marker !== null) {  
                bus.marker.remove();
              }
            });
          }
        });
      }
    };

    var pushBusData = function (service, plate, date, stopCode, stopIndex, distance, status) {
      if ($scope.servicesData[service.code].buses[plate] === undefined) {
        $scope.servicesData[service.code].buses[plate] = {
          positions: [],
          marker: null,
          color: service.color
        };
      }

      $scope.servicesData[service.code].buses[plate].positions.push({
        date: date,
        stopCode: stopCode,
        stopIndex: stopIndex,
        distance: parseFloat(distance),
        status: status
      });
    };

    var removeBusMarker = function (service, busPlate) {
      if ($scope.servicesData[service.code].buses[busPlate].marker !== null) {
        $scope.servicesData[service.code].buses[busPlate].marker.remove();
        $scope.servicesData[service.code].buses[busPlate].marker = null;
      }
    };

    var getBusPositionFromStop = function (service, stopIndex, targetDistance) {
      var stopPolylineIndex = $scope.servicesData[service.code].stops[stopIndex].polylineIndex;

      var targetPosition = null;
      var d = 0.0;

      var positions = $scope.servicesData[service.code].polyline.getLatLngs();

      for (var index = stopPolylineIndex; index >= 1; index -= 1) {
        var pathDistance = positions[index].distanceTo(positions[index - 1]);

        if (d + pathDistance >= targetDistance) {
          targetPosition = positions[index];
          // TODO: Interpolate position
          // targetPosition = google.maps.geometry.spherical.interpolate(
          //   positions.getAt(index),
          //   positions.getAt(index - 1),
          //   1.0 * (distance - d) / pathDistance
          // );
          break;
        } else {
          d += pathDistance;
        }
      }

      return targetPosition;
    };

    var hideToast = function () {
      $mdToast.hide($scope.toastPromise);

      delete $scope.toastScope;
      delete $scope.toastPromise;
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

    var getPolylineDistance = function (latLngs) {
      var d = 0;
      for (var i = 1; i < latLngs.length; i += 1) {
        d += latLngs[i].distanceTo(latLngs[i - 1]);
      }
      return d / 1000;
    };

    var setBusesMarkers = function (service) {
      angular.forEach($scope.servicesData[service.code].buses, function (busData, busPlate) {
        if (busData.positions.length === 0) {
          removeBusMarker(service, busPlate);
          return;
        }

        var markerTemplate = $scope.busMarkerSvgTemplate.replace('{{bus_service}}', service.code);
        markerTemplate = markerTemplate.replace('{{bus_color}}', busData.color);
        markerTemplate = markerTemplate.replace('{{bus_plate}}', busPlate);

        var polylinePositions = $scope.servicesData[service.code].polyline.getLatLngs();

        var distancesSum = 0.0;
        angular.forEach(busData.positions, function (position) {
          var a = $scope.servicesData[service.code].stops[busData.positions[0].stopIndex].polylineIndex;
          var b = $scope.servicesData[service.code].stops[position.stopIndex].polylineIndex;

          var min_ = Math.min(a, b);
          var max_ = Math.max(a, b);

          distancesSum += getPolylineDistance(polylinePositions.slice(min_, max_ + 1)) + position.distance;
        });

        var avgPosition = getBusPositionFromStop(
          service,
          busData.positions[0].stopIndex,
          distancesSum / busData.positions.length
        );

        if (avgPosition === null) {
          removeBusMarker(service, busPlate);
          console.log('Null average position', busPlate);
          return;
        }

        if (busData.marker === null) {
          var marker = new L.Marker(
            avgPosition,
            {
              id: busPlate,
              title: busPlate,
              icon: L.icon({
                iconUrl: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(markerTemplate),
                iconAnchor: [30, 35],
              })
            }
          );

          busData.marker = marker;

          marker.addTo($scope.map);
        } else {
          if (busData.positions.length > 0) {
            busData.marker.setLatLng(avgPosition);
          } else {
            removeBusMarker(service, busPlate);
          }
        }
      });

      $scope.toastScope.services = Object.keys($scope.updating);

      if (Object.keys($scope.updating).length === 1) {
        hideToast();
      }

      delete $scope.updating[service.code];
    };

    var getServiceBuses = function (service, date, stopIndex) {
      if ($scope.selectedStop === undefined) {
        return;
      }

      if (stopIndex < 0) {
        setBusesMarkers(service);
        return;
      }

      var stopCode = $scope.servicesData[service.code].stops[stopIndex].code;

      $http({
        method: 'GET',
        url: sprintf(API.getPrediction, stopCode, service.code)
      }).then(function (response) {
        if (response.data.servicios !== undefined && response.data.servicios.item !== undefined) {
          angular.forEach(response.data.servicios.item, function (serviceItem) {
            if (serviceItem.ppubus1 !== undefined) {
              pushBusData(
                service,
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
                service,
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
        getServiceBuses(service, date, stopIndex - 1);
      }, function (response) {
        console.log('getStopData error', response);
        getServiceBuses(service, date, stopIndex - 1);
      });
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

    var triggerUpdate = function (service, stopIndex) {
      if (Object.keys($scope.servicesData[service.code]).length > 0) {
        if ($scope.servicesData[service.code].buses !== undefined) {
          angular.forEach($scope.servicesData[service.code].buses, function (bus) {
            bus.positions = [];
          });
        }
      }

      if ($scope.updateTimeouts[service.code] !== undefined) {
        $timeout.cancel($scope.updateTimeouts[service.code]);
      }

      if (Object.keys($scope.updating).length === 0) {
        // Show toast
        if ($scope.toastScope === undefined) {
          $scope.toastScope = $scope.$new(true);
        }
        getToastPromise();
      }

      if ($scope.toastScope.services === undefined) {
        $scope.toastScope.services = [];
      }
      $scope.toastScope.services.push(service.code);

      $scope.updating[service.code] = true;

      getServiceBuses(service, new Date(), stopIndex);

      $scope.updateTimeouts[service.code] = $timeout(
        function () {
          triggerUpdate(service, stopIndex);
        },
        60 * 1000
      );
    };

    var setServicePolyline = function (stop, service, serviceData) {
      if ($scope.selectedStop === undefined) {
        return;
      }
      
      var index = 0;

      var minLat = Number.POSITIVE_INFINITY;
      var minLng = Number.POSITIVE_INFINITY;
      var maxLat = Number.NEGATIVE_INFINITY;
      var maxLng = Number.NEGATIVE_INFINITY;

      // Detect direction
      var direction = 0;

      for (var d = 0; d < 2; d += 1) {
        for (var i = 0; i < serviceData[d].paradas.length; i += 1) {
          if (serviceData[d].paradas[i].codSimt === stop.code) {
            direction = d;
            break;
          }
        }
      }

      var polylinePositions = [];

      angular.forEach(serviceData[direction].shapes, function (shape) {
        var lat = parseFloat(shape.latShape);
        var lng = parseFloat(shape.lonShape);

        polylinePositions.push(new L.LatLng(lat, lng));

        minLat = Math.min(lat, minLat);
        minLng = Math.min(lng, minLng);
        maxLat = Math.max(lat, maxLat);
        maxLng = Math.max(lng, maxLng);
      });

      angular.forEach(serviceData[direction].paradas, function (stopData) {
        var marker = L.marker(
          [parseFloat(stopData.stop.stopCoordenadaX), parseFloat(stopData.stop.stopCoordenadaY)],
          {
            id: stopData.codSimt,
            title: stopData.codSimt
          }
        );
        marker.code = stopData.codSimt;

        $scope.servicesData[service.code].stops.push(marker);
      });

      var latestIndex = 0;
      var stopMarker = null;

      for (var i = 0; i < $scope.servicesData[service.code].stops.length; i += 1) {
        var projectionPosition = MapsUtils.getClosestPointProjection(
          $scope.servicesData[service.code].stops[i].getLatLng(),
          polylinePositions,
          latestIndex
        );

        if (projectionPosition !== null && projectionPosition[0] !== -1) {
          $scope.servicesData[service.code].stops[i].valid = true;
          $scope.servicesData[service.code].stops[i].polylineIndex = projectionPosition[0] + 1;
          polylinePositions.splice(projectionPosition[0] + 1, 0, $scope.servicesData[service.code].stops[i].getLatLng());
          latestIndex = projectionPosition[0];

          if ($scope.servicesData[service.code].stops[i].code === stop.code) {
            stopMarker = $scope.servicesData[service.code].stops[i];
            break;
          }
        } else {
          $scope.servicesData[service.code].stops[i].valid = false;
          console.log('Projection not found for stop', $scope.servicesData[service.code].stops[i].code);
        }
      }

      // If there's no polyline projection to stop
      if (stopMarker === null) {
        return;
      }

      polylinePositions.splice(stopMarker.polylineIndex + 1, polylinePositions.length - stopMarker.polylineIndex - 1);

      var polyline = L.polyline(
        polylinePositions,
        {
          color: service.color,
          weight: 3,
          opacity: 1.0,
          interactive: false
        }
      );
      $scope.servicesData[service.code].polyline = polyline;
      polyline.addTo($scope.map);

      triggerUpdate(service, $scope.servicesData[service.code].stops.indexOf(stopMarker));
    };

    var loadTemplates = function () {
      // Get bus markers SVG
      $templateRequest('images/markers/marker_bus.svg').then(function (template) {
        $scope.busMarkerSvgTemplate = template;
      }, function () {
        console.log('getBusMarkerSvg error');
      });

      // Popup stop
      $templateRequest('views/popup_stop.html').then(function (template) {
        $scope.popupStopTemplate = template;
      }, function () {
        console.log('getpopupStopTemplate error');
      });
    };

    var hideOtherStops = function () {
      if (Object.keys($scope.closestStops).length > 0) {
        angular.forEach($scope.closestStops, function (marker, stopCode) {
          if (stopCode !== $scope.selectedStop.code) {
            marker.remove();
          }
        });
      }
    };

    var getStopBuses = function (stop) {
      $scope.map.closePopup();

      resetServicesData();

      $scope.servicesData = {};
      $scope.selectedStop = stop;

      angular.forEach(stop.services, function (service) {
        $scope.servicesData[service.code] = {
          stops: [],
          buses: {}
        };
      });

      $scope.detectClosestStops = false;

      hideOtherStops();

      angular.forEach($scope.selectedStop.services, function (service) {
        $http({
          method: 'GET',
          url: sprintf(API.getRoute, service.code)
        }).then(function (response) {
          setServicePolyline($scope.selectedStop, service, response.data);
        }, function (response) {
          console.log('getStopBuses error', response);
        });
      });
    };

    $scope.getStopMarker = function (stopRawData) {
      var stopMarker = new L.Marker(
        stopRawData.pos,
        {
          title: stopRawData.cod,
          icon: L.icon({
            iconUrl: '/images/markers/bus_stop_small.png',
            iconSize: [30, 33]
          })
        }
      );

      stopMarker.scope = angular.extend($scope.$new(true), {
        code: stopRawData.cod,
        name: stopRawData.name,
        services: stopRawData.servicios.map(function (service) {
          return {
            code: service.cod,
            color: service.color
          };
        }),
        getStopBuses: function () {
          return getStopBuses(this);
        }
      });

      $scope.$watch('selectedStop', function (newValue) {
        stopMarker.scope.selectedStop = newValue;
      });

      var onMarkerClick = function (event) {
        if ($scope.popupStop !== undefined) {
          $scope.popupStop.remove();
        }

        var templates = $compile($scope.popupStopTemplate)(stopMarker.scope);

        $timeout(function () {
          $scope.popupStop
            .setLatLng(stopMarker.getLatLng())
            .setContent(templates[0])
            .openOn($scope.map);
        });
      };

      stopMarker.on('click', onMarkerClick);
      stopMarker.onMarkerClickFunc = onMarkerClick;

      return stopMarker;
    };

    var setStops = function (data) {
      resetClosestStops();

      angular.forEach(data, function (stopRawData) {
        var stopMarker = $scope.getStopMarker(stopRawData);
        $scope.closestStops[stopMarker.scope.code] = stopMarker;
        stopMarker.addTo($scope.map);
      });
    };

    var getClosestStops = function () {
      if ( ! $scope.detectClosestStops) {
        return;
      }

      var mapCenter = $scope.map.getCenter();

      $http({
        method: 'GET',
        url: sprintf(API.getStops, mapCenter.lat, mapCenter.lng)
      }).then(function (response) {
        setStops(response.data);
      }, function (response) {
        console.log('getClosestStops error', response);
      });
    };

    var loadMap = function () {
      $scope.map = L.map('map_container', {doubleClickZoom: false, tap: true, zoomControl: false}).setView([-33.46, -70.665], 16);
      L.tileLayer(configs.mapboxUrl, {id: 'mapbox.light', attribution: 'Mapbox'}).addTo($scope.map);

      // Hack to avoid map loading bug
      $timeout(function () {
        var evt = $window.document.createEvent('UIEvents'); 
        evt.initUIEvent('resize', true, false, $window, 0); 
        $window.dispatchEvent(evt);
      });

      $scope.detectClosestStops = true;

      $scope.servicesData = {};

      $scope.closestStops = {};
      $scope.map.on('moveend', getClosestStops);

      $scope.popupStop = L.popup();
    };

    $scope.stopsSearch = angular.extend($scope.$new(true), {
      load: function () {
        localStorageService.bind(this, 'latestStops');

        $http({
          method: 'GET',
          url: API.getAllStops
        }).then(function (response) {
          $scope.stopsSearch.stops = response.data.map(function (code) {
            return {code: code};
          });
        }, function (response) {
          console.log('stopsSearch getStops error', response);
        });        
      },
      search: function (text) {
        var needle = text.toUpperCase() || '';
        return $scope.stopsSearch.stops.filter(function (stop) {
          return stop.code.toUpperCase().startsWith(needle);
        });
      },
      set: function (stop) {
        if (stop === undefined || stop === null) {
          return;
        }
        this.selectedStop = stop;
        this._save(stop);
      },
      _save: function (stop) {
        if (this.latestStops === undefined || this.latestStops === null) {
          this.latestStops = [];
          this.latestStops.push(stopRawData);
          return;
        }

        var index = -1;
        for (var i = 0; i < this.latestStops.length ; i += 1) {
          if (this.latestStops[i].cod === stop.code) {
            index = i;
            break;
          }
        }

        if (index > -1) {
          this.latestStops.splice(index, 1);
        }

        var that = this;

        // Die pls
        $http({
          method: 'GET',
          url: sprintf(API.getPrediction, stop.code, '')
        }).then(function (response) {
          var stopRawData = {
            pos: [response.data.x, response.data.y],
            cod: stop.code,
            name: response.data.nomett,
            servicios: response.data.servicios.item.map(function (service) {
              return {
                cod: service.servicio,
                color: service.color
              }
            })
          };

          var stopMarker = $scope.getStopMarker(stopRawData);

          that.latestStops.unshift(stopRawData);

          $scope.map.panTo(stopMarker.getLatLng());

          stopMarker.onMarkerClickFunc();
        }, function (response) {
          console.log('getSingleStopData error', response);
        });
      }
    });

    $scope.reset = function () {
      if (Object.keys($scope.updating).length > 0) {
        angular.forEach($scope.updating, function (_, key) {
          delete $scope.updating[key];
        });
      }

      hideToast();

      if (Object.keys($scope.updateTimeouts.length > 0)) {
        angular.forEach($scope.updateTimeouts, function (t) {
          $timeout.cancel(t);
        });
      }

      resetClosestStops();
      resetServicesData();

      $scope.detectClosestStops = true;
      delete $scope.selectedStop;

      getClosestStops();
    };

    $scope.$mdMedia = $mdMedia;
    $scope.updateTimeouts = {};
    $scope.updating = {};

    loadTemplates();
    $scope.stopsSearch.load();
    loadMap();
  });
