'use strict';

angular.module('transantiagoScannerApp')
  .factory('MapsUtils', function () {

    return {
      // From http://stackoverflow.com/questions/1502590/calculate-distance-between-two-points-in-google-maps-v3
      radians: function (degrees) {
        return degrees * Math.PI / 180;
      },
      // From http://stackoverflow.com/questions/1502590/calculate-distance-between-two-points-in-google-maps-v3
      getDistance: function (p1, p2) {
        var R = 6378137; // Earth’s mean radius in meter
        var dLat = this.radians(p2.lat() - p1.lat());
        var dLong = this.radians(p2.lng() - p1.lng());
        var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(this.radians(p1.lat())) * Math.cos(this.radians(p2.lat())) *
          Math.sin(dLong / 2) * Math.sin(dLong / 2);
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        var d = R * c;
        return d; // returns the distance in meter
      },
      getMiddlePosition: function (latLngA, latLngB) {
        return new google.maps.LatLng((latLngA.lat() + latLngB.lat()) / 2, (latLngA.lng() + latLngB.lng()) / 2);
      },
      getProjectionLatLng: function (projection, latLngA, latLngB, latLngP) {
        var pointA = projection.fromLatLngToPoint(latLngA);
        var pointB = projection.fromLatLngToPoint(latLngB);
        var pointP = projection.fromLatLngToPoint(latLngP);

        var m1 = 1.0 * (pointB.y - pointA.y) / (pointB.x - pointA.x);
        var m2 = -1.0 / m1;

        var x = (pointP.y - m2 * pointP.x - pointA.y + m1 * pointA.x) / (m1 - m2);
        var y = m1 * (x - pointA.x) + pointA.y;

        return projection.fromPointToLatLng(new google.maps.Point(x, y));
      },
      getClosestPointsProjection: function (map, positions, latLng, startIndex) {
        var projection = map.getProjection();

        var minHeight = Number.MAX_SAFE_INTEGER;
        var foundIndex = -1;
        var foundPosition = null;

        for (var i = startIndex; i < positions.length - 1; i += 1) {
          var projectionLatLng = this.getProjectionLatLng(projection, positions[i], positions[i + 1], latLng);

          var middlePoint = this.getMiddlePosition(positions[i], positions[i + 1]);

          var radius = this.getDistance(positions[i], middlePoint);
          var distance = this.getDistance(middlePoint, latLng);

          var height = this.getDistance(projectionLatLng, latLng);

          if (distance <= 1.2 * radius && height < minHeight) {
            minHeight = height;
            foundIndex = i;
            foundPosition = projectionLatLng;
          }
        }

        return [foundIndex, foundPosition];
      }
    };
  });
