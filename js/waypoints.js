/// <reference path="../typings/google.maps.d.ts" />
/// <reference path="site.ts" />
var locationsAdded = 1;
var map;
var points = [];
var markers = [];
var directionsDisplay;
window.onload = function () {
    loadGoogleMaps("places", function () {
        var latlng = new google.maps.LatLng(23.8104061, 90.37561);
        var options = {
            zoom: 6,
            center: latlng,
            mapTypeId: google.maps.MapTypeId.ROADMAP,
            draggableCursor: "crosshair"
        };
        map = new google.maps.Map(document.getElementById("map"), options);
        map.controls[google.maps.ControlPosition.TOP_RIGHT].push(FullScreenControl(map));
        google.maps.event.addListener(map, "click", function (location) {
            getLocationInfo(location.latLng, "Location " + locationsAdded);
            locationsAdded++;
        });
        var renderOptions = { markerOptions: { visible: false } };
        directionsDisplay = new google.maps.DirectionsRenderer(renderOptions);
        // autocomplete
        var autocomplete = new google.maps.places.Autocomplete(document.getElementById("location"), {
            bounds: null,
            componentRestrictions: null,
            types: []
        });
        google.maps.event.addListener(autocomplete, "place_changed", function () {
            var place = autocomplete.getPlace();
            getLocationInfo(place.geometry.location, $("#location").val());
            map.setCenter(place.geometry.location);
            $("#location").val("");
        });
    });
};
function addLatLng() {
    "use strict";
    var latLong = new google.maps.LatLng($("#lat").val(), $("#lng").val());
    getLocationInfo(latLong, "Location " + locationsAdded);
    locationsAdded++;
    map.setCenter(latLong);
    $("#lat").val("");
    $("#lng").val("");
}
function addLocation() {
    "use strict";
    var geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address: $("#location").val() }, function (results) {
        if (results[0]) {
            var result = results[0];
            var latLong = result.geometry.location;
            getLocationInfo(latLong, $("#location").val());
            map.setCenter(latLong);
            $("#location").val("");
        }
        else {
            alert("Location not found");
        }
    });
}
function getLocationInfo(latlng, locationName) {
    "use strict";
    if (latlng != null) {
        var point = { LatLng: latlng, LocationName: locationName };
        points.push(point);
        buildPoints();
    }
}
function clearMarkers() {
    "use strict";
    for (var i = 0; i < markers.length; i++) {
        markers[i].setMap(null);
    }
    markers = [];
}
function buildPoints() {
    "use strict";
    clearMarkers();
    var html = "";
    for (var i = 0; i < points.length; i++) {
        var marker = new google.maps.Marker({ position: points[i].LatLng, title: points[i].LocationName });
        markers.push(marker);
        marker.setMap(map);
        html += "<tr><td>" + points[i].LocationName + "</td><td>" + roundNumber(points[i].LatLng.lat(), 6) + "</td><td>" + roundNumber(points[i].LatLng.lng(), 6) + "</td><td><button class=\"delete btn\" onclick=\"removeRow(" + i + ");\">Delete</button></td><td>";
        if (i < points.length - 1) {
            html += "<button class=\"moveDown btn\" onclick=\"moveRowDown(" + i + ");\">Move down</button>";
        }
        html += "</td><td>";
        if (i > 0) {
            html += "<button class=\"moveUp btn\" onclick=\"moveRowUp(" + i + ");\">Move up</button>";
        }
        html += "</td></tr>";
    }
    $("#waypointsLocations tbody").html(html);
}
function clearPolyLine() {
    "use strict";
    points = [];
    buildPoints();
    clearRouteDetails();
}
function clearRouteDetails() {
    "use strict";
    directionsDisplay.setMap(null);
    directionsDisplay.setPanel(null);
    $("#distance").html("");
    $("#duration").html("");
}
function removeRow(index) {
    "use strict";
    points.splice(index, 1);
    buildPoints();
    clearRouteDetails();
}
function moveRowDown(index) {
    "use strict";
    var item = points[index];
    points.splice(index, 1);
    points.splice(index + 1, 0, item);
    buildPoints();
    clearRouteDetails();
}
function moveRowUp(index) {
    "use strict";
    var item = points[index];
    points.splice(index, 1);
    points.splice(index - 1, 0, item);
    buildPoints();
    clearRouteDetails();
}
function getDirections() {
    "use strict";
    var directionsDiv = document.getElementById("directions");
    directionsDiv.innerHTML = "Loading...";
    var directions = new google.maps.DirectionsService();
    // build array of waypoints (excluding start and end)
    var waypts = [];
    var end = points.length - 1;
    var dest = points[end].LatLng;
    if (document.getElementById("roundTrip").checked) {
        end = points.length;
        dest = points[0].LatLng;
    }
    for (var i = 1; i < end; i++) {
        waypts.push({ location: points[i].LatLng });
    }
    var routeType = $("#routeType").val();
    var travelMode = google.maps.TravelMode.DRIVING;
    if (routeType === "Walking") {
        travelMode = google.maps.TravelMode.WALKING;
    }
    else if (routeType === "Public transport") {
        travelMode = google.maps.TravelMode.TRANSIT;
    }
    else if (routeType === "Cycling") {
        travelMode = google.maps.TravelMode.BICYCLING;
    }
    var unitsVal = $("#directionUnits").val();
    var directionUnits = google.maps.UnitSystem.METRIC;
    if (unitsVal === "Miles") {
        directionUnits = google.maps.UnitSystem.IMPERIAL;
    }
    var optimiseRoute = document.getElementById("optimise").checked;
    var request = {
        origin: points[0].LatLng,
        destination: dest,
        waypoints: waypts,
        travelMode: travelMode,
        unitSystem: directionUnits,
        optimizeWaypoints: optimiseRoute
    };
    directions.route(request, function (result, status) {
        if (status === google.maps.DirectionsStatus.OK) {
            directionsDiv.innerHTML = "";
            directionsDisplay.setMap(map);
            directionsDisplay.setPanel(directionsDiv);
            directionsDisplay.setDirections(result);
            // calculate total distance and duration
            var distance = 0;
            var time = 0;
            var theRoute = result.routes[0];
            // start KML
            var kmlCode = kmlDocumentStart() + kmlStyleThickLine() + "<Placemark>\n" + kmlLineStart();
            for (var i = 0; i < theRoute.legs.length; i++) {
                var theLeg = theRoute.legs[i];
                distance += theLeg.distance.value;
                time += theLeg.duration.value;
                for (var j = 0; j < theLeg.steps.length; j++) {
                    for (var k = 0; k < theLeg.steps[j].path.length; k++) {
                        var thisPoint = theLeg.steps[j].path[k];
                        kmlCode += roundNumber(thisPoint.lng(), 6) + "," + roundNumber(thisPoint.lat(), 6) + " ";
                    }
                }
            }
            $("#distance").html("Total distance: " + getDistance(distance) + ", ");
            $("#duration").html("total duration: " + Math.round(time / 60) + " minutes");
            // end KML
            kmlCode += kmlLineEnd() + kmlStyleUrl("thickLine") + "</Placemark>\n" + kmlDocumentEnd();
            $("#kmlData").val(kmlCode);
        }
        else {
            var statusText = getDirectionStatusText(status);
            directionsDiv.innerHTML = "An error occurred - " + statusText;
        }
    });
}
function getDistance(distance) {
    "use strict";
    if ($("#directionUnits").val() === "Miles") {
        return Math.round((distance * 0.621371192) / 100) / 10 + " miles";
    }
    else {
        return Math.round(distance / 100) / 10 + " km";
    }
}
