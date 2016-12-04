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
        return p1.distanceTo(p2);
      },
      getMiddlePosition: function (latLngA, latLngB) {
        return new L.LatLng((latLngA.lat + latLngB.lat) / 2, (latLngA.lng + latLngB.lng) / 2);
      },
      getProjectionLatLng: function (latLngA, latLngB, latLngP) {
        var pointA = L.Projection.SphericalMercator.project(latLngA);
        var pointB = L.Projection.SphericalMercator.project(latLngB);
        var pointP = L.Projection.SphericalMercator.project(latLngP);

        var m1 = 1.0;
        if (pointB.x !== pointA.x) {
          m1 = 1.0 * (pointB.y - pointA.y) / (pointB.x - pointA.x);
        }

        var m2 = -1.0;
        if (m1 !== 0) {
          m2 = -1.0 / m1;
        }

        var x = (pointP.y - m2 * pointP.x - pointA.y + m1 * pointA.x) / (m1 - m2);
        var y = m1 * (x - pointA.x) + pointA.y;

        return L.Projection.SphericalMercator.unproject(new L.point(x, y));
      },
      getClosestPointProjection: function (point, positions, startIndex) {
        var minHeight = Number.MAX_SAFE_INTEGER;
        var foundIndex = -1;
        var foundPosition = null;

        for (var i = startIndex; i < positions.length - 1; i += 1) {
          var projectionLatLng = this.getProjectionLatLng(positions[i], positions[i + 1], point);

          var middlePoint = this.getMiddlePosition(positions[i], positions[i + 1]);

          var radius = this.getDistance(positions[i], middlePoint);
          var distance = this.getDistance(middlePoint, point);

          var height = this.getDistance(projectionLatLng, point);

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
