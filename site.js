/// <reference path="../Scripts/typings/jquery/jquery.d.ts" />
/// <reference path="../Scripts/typings/jqueryui/jqueryui.d.ts" />
/// <reference path="../typings/google.maps.d.ts" />
;
;
function repeat(chr, count) {
    var str = "";
    for (var x = 0; x < count; x++) {
        str += chr;
    }
    return str;
}
;
String.prototype.padL = function (width, pad) {
    if (!width || width < 1) {
        return this;
    }
    if (!pad) {
        pad = " ";
    }
    var length = width - this.length;
    if (length < 1) {
        return this.substr(0, width);
    }
    return (repeat(pad, length) + this).substr(0, width);
};
// extensions to Google Maps API
function distanceTo(from, a) {
    var ra = Math.PI / 180;
    var b = from.lat() * ra, c = a.lat() * ra, d = b - c;
    var g = from.lng() * ra - a.lng() * ra;
    var f = 2 * Math.asin(Math.sqrt(Math.pow(Math.sin(d / 2), 2) + Math.cos(b) * Math.cos(c) * Math.pow(Math.sin(g / 2), 2)));
    return f * 6378137;
}
;
function roundNumber(num, dec) {
    return Math.round(num * Math.pow(10, dec)) / Math.pow(10, dec);
}
// KML support
function kmlDocumentStart() {
    return "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n" + "<kml xmlns=\"http://www.opengis.net/kml/2.2\">\n" + "<Document>\n";
}
function kmlDocumentEnd() {
    return "</Document>\n</kml>";
}
function kmlLineStart() {
    return "<LineString><coordinates>";
}
function kmlLineEnd() {
    return "</coordinates></LineString>";
}
function kmlPolygonStart() {
    return "<Polygon><outerBoundaryIs><LinearRing><coordinates>";
}
function kmlPolygonEnd() {
    return "</coordinates></LinearRing></outerBoundaryIs></Polygon>";
}
function kmlStyleThickLine() {
    return "<Style id=\"thickLine\"><LineStyle><width>2.5</width></LineStyle></Style>\n";
}
function kmlStyleTransparent50Poly() {
    return "<Style id=\"transparent50Poly\"><PolyStyle><color>7fffffff</color></PolyStyle></Style>\n";
}
function kmlStyleUrl(style) {
    return "<styleUrl>#" + style + "</styleUrl>";
}
// common Google Map functions
function GetElevation(lat, long, selector) {
    var elevator = new google.maps.ElevationService();
    var locations = [];
    // Retrieve the clicked location and push it on the array
    locations.push(new google.maps.LatLng(lat, long));
    // Create a LocationElevationRequest object using the array's one value
    var positionalRequest = {
        locations: locations
    };
    // Initiate the location request
    elevator.getElevationForLocations(positionalRequest, function (results, status) {
        if (status === google.maps.ElevationStatus.OK) {
            // Retrieve the first result
            if (results[0]) {
                var elev = results[0].elevation;
                var elevFeet = elev * 3.2808399;
                $(selector).html(Math.round(elev) + " metres (" + Math.round(elevFeet) + " feet)");
            }
            else {
                $(selector).html("Not found");
            }
        }
        else {
            $(selector).html("Not found");
        }
    });
}
function ReverseGeocode(lat, long, selector) {
    var geocoder = new google.maps.Geocoder();
    var latLong = new google.maps.LatLng(lat, long);
    geocoder.geocode({ latLng: latLong, address: null }, function (results, status) {
        if (status === google.maps.GeocoderStatus.OK) {
            if (results) {
                var foundAddress = false;
                for (var i = 0; i < results.length; i++) {
                    if ((results[i].types[0] === "street_address") || (results[i].types[0] === "route")) {
                        $(selector).html(results[i].formatted_address);
                        $(selector).val(results[i].formatted_address);
                        foundAddress = true;
                        break;
                    }
                }
                if (!foundAddress) {
                    $(selector).html(results[0].formatted_address);
                    $(selector).val(results[0].formatted_address);
                }
            }
        }
    });
}
function getDirectionStatusText(status) {
    switch (status) {
        case google.maps.DirectionsStatus.INVALID_REQUEST:
            return "Invalid request";
        case google.maps.DirectionsStatus.MAX_WAYPOINTS_EXCEEDED:
            return "Maximum waypoints exceeded";
        case google.maps.DirectionsStatus.NOT_FOUND:
            return "Not found";
        case google.maps.DirectionsStatus.OVER_QUERY_LIMIT:
            return "Over query limit";
        case google.maps.DirectionsStatus.REQUEST_DENIED:
            return "Request denied";
        case google.maps.DirectionsStatus.UNKNOWN_ERROR:
            return "Unknown error";
        case google.maps.DirectionsStatus.ZERO_RESULTS:
            return "Zero results";
        default:
            return status.toString();
    }
}
function getKmlErrorMsg(status) {
    switch (status) {
        case google.maps.KmlLayerStatus.DOCUMENT_TOO_LARGE:
            return "The file is too large to display";
        case google.maps.KmlLayerStatus.INVALID_REQUEST:
            return "Invalid request";
        case google.maps.KmlLayerStatus.INVALID_DOCUMENT:
            return "The file is not a valid KML, KMZ or GeoRSS file";
        case google.maps.KmlLayerStatus.DOCUMENT_NOT_FOUND:
            return "The requested file does not exist";
        default:
            return status.toString();
    }
}
// indexOf method if it doesn't exist
if (!Array.prototype.indexOf) {
    Array.prototype.indexOf = function (elt /*, from*/) {
        var len = this.length;
        var from = Number(arguments[1]) || 0;
        from = (from < 0) ? Math.ceil(from) : Math.floor(from);
        if (from < 0) {
            from += len;
        }
        for (; from < len; from++) {
            if (from in this && this[from] === elt) {
                return from;
            }
        }
        return -1;
    };
}
function showDistance(distance) {
    return Math.round(distance / 100) / 10 + " km (" + Math.round((distance * 0.621371192) / 100) / 10 + " miles)";
}
function getAddressComponent(result, component) {
    for (var i = 0; i < result.address_components.length; i++) {
        var comp = result.address_components[i];
        for (var j = 0; j < comp.types.length; j++) {
            if (comp.types[j] === component) {
                return comp.long_name;
            }
        }
    }
    return "";
}
function buildAddress(result, separator) {
    return getAddressComponent(result, "street_number") + separator + getAddressComponent(result, "route") + separator + getAddressComponent(result, "locality") + separator + getAddressComponent(result, "postal_town") + separator + getAddressComponent(result, "administrative_area_level_3") + separator + getAddressComponent(result, "administrative_area_level_2") + separator + getAddressComponent(result, "administrative_area_level_1") + separator + getAddressComponent(result, "postal_code") + separator + getAddressComponent(result, "country");
}
function addCommas(nStr) {
    nStr += "";
    var x = nStr.split(".");
    var x1 = x[0];
    var x2 = x.length > 1 ? "." + x[1] : "";
    var rgx = /(\d+)(\d{3})/;
    while (rgx.test(x1)) {
        x1 = x1.replace(rgx, "$1,$2");
    }
    return x1 + x2;
}
function XmlEncode(text) {
    text = text.replace(/&/g, "&amp;");
    text = text.replace(/\"/g, "&quot;");
    text = text.replace(/\'/g, "&apos;");
    text = text.replace(/</g, "&lt;");
    text = text.replace(/>/g, "&gt;");
    return text;
}
function getWhat3Words(latLong, callback) {
    var data = {
        key: "0HZ96SU9",
        position: latLong.lat() + "," + latLong.lng()
    };
    $.post("http://api.what3words.com/position", data, function (response) {
        callback(response.words[0] + "." + response.words[1] + "." + response.words[2]);
    });
}
if (!Date.prototype.toISOString) {
    (function () {
        function pad(number) {
            var r = String(number);
            if (r.length === 1) {
                r = "0" + r;
            }
            return r;
        }
        Date.prototype.toISOString = function () {
            return this.getUTCFullYear() + "-" + pad(this.getUTCMonth() + 1) + "-" + pad(this.getUTCDate()) + "T" + pad(this.getUTCHours()) + ":" + pad(this.getUTCMinutes()) + ":" + pad(this.getUTCSeconds()) + "." + String((this.getUTCMilliseconds() / 1000).toFixed(3)).slice(2, 5) + "Z";
        };
    }());
}
function FullScreenControl(map, enterFull, exitFull) {
    if (enterFull === void 0) { enterFull = null; }
    if (exitFull === void 0) { exitFull = null; }
    if (enterFull == null) {
        enterFull = "Full screen";
    }
    if (exitFull == null) {
        exitFull = "Exit full screen";
    }
    var controlDiv = document.createElement("div");
    controlDiv.className = "fullScreen";
    controlDiv.index = 1;
    controlDiv.style.padding = "5px";
    // Set CSS for the control border.
    var controlUI = document.createElement("div");
    controlUI.style.backgroundColor = "white";
    controlUI.style.borderStyle = "solid";
    controlUI.style.borderWidth = "1px";
    controlUI.style.borderColor = "#717b87";
    controlUI.style.cursor = "pointer";
    controlUI.style.textAlign = "center";
    controlUI.style.boxShadow = "rgba(0, 0, 0, 0.298039) 0px 1px 4px -1px";
    controlDiv.appendChild(controlUI);
    // Set CSS for the control interior.
    var controlText = document.createElement("div");
    controlText.style.fontFamily = "Roboto,Arial,sans-serif";
    controlText.style.fontSize = "11px";
    controlText.style.fontWeight = "400";
    controlText.style.paddingTop = "1px";
    controlText.style.paddingBottom = "1px";
    controlText.style.paddingLeft = "6px";
    controlText.style.paddingRight = "6px";
    controlText.innerHTML = "<strong>" + enterFull + "</strong>";
    controlUI.appendChild(controlText);
    // set print CSS so the control is hidden
    var head = document.getElementsByTagName("head")[0];
    var newStyle = document.createElement("style");
    newStyle.setAttribute("type", "text/css");
    newStyle.setAttribute("media", "print");
    var cssText = ".fullScreen { display: none;}";
    var texNode = document.createTextNode(cssText);
    try {
        newStyle.appendChild(texNode);
    }
    catch (e) {
        // IE8 hack
        newStyle.styleSheet.cssText = cssText;
    }
    head.appendChild(newStyle);
    var fullScreen = false;
    var interval;
    var mapDiv = map.getDiv();
    var divStyle = mapDiv.style;
    if (mapDiv.runtimeStyle) {
        divStyle = mapDiv.runtimeStyle;
    }
    var originalPos = divStyle.position;
    var originalWidth = divStyle.width;
    var originalHeight = divStyle.height;
    // IE8 hack
    if (originalWidth === "") {
        originalWidth = mapDiv.style.width;
    }
    if (originalHeight === "") {
        originalHeight = mapDiv.style.height;
    }
    var originalTop = divStyle.top;
    var originalLeft = divStyle.left;
    var originalZIndex = divStyle.zIndex;
    var bodyStyle = document.body.style;
    if (document.body.runtimeStyle) {
        bodyStyle = document.body.runtimeStyle;
    }
    var originalOverflow = bodyStyle.overflow;
    controlDiv.goFullScreen = function () {
        var center = map.getCenter();
        mapDiv.style.position = "fixed";
        mapDiv.style.width = "100%";
        mapDiv.style.height = "100%";
        mapDiv.style.top = "0";
        mapDiv.style.left = "0";
        mapDiv.style.zIndex = "100";
        document.body.style.overflow = "hidden";
        controlText.innerHTML = "<strong>" + exitFull + "</strong>";
        fullScreen = true;
        google.maps.event.trigger(map, "resize");
        map.setCenter(center);
        // this works around street view causing the map to disappear, which is caused by Google Maps setting the 
        // CSS position back to relative. There is no event triggered when Street View is shown hence the use of setInterval
        interval = setInterval(function () {
            if (mapDiv.style.position !== "fixed") {
                mapDiv.style.position = "fixed";
                google.maps.event.trigger(map, "resize");
            }
        }, 100);
    };
    controlDiv.exitFullScreen = function () {
        var center = map.getCenter();
        if (originalPos === "") {
            mapDiv.style.position = "relative";
        }
        else {
            mapDiv.style.position = originalPos;
        }
        mapDiv.style.width = originalWidth;
        mapDiv.style.height = originalHeight;
        mapDiv.style.top = originalTop;
        mapDiv.style.left = originalLeft;
        mapDiv.style.zIndex = originalZIndex;
        document.body.style.overflow = originalOverflow;
        controlText.innerHTML = "<strong>" + enterFull + "</strong>";
        fullScreen = false;
        google.maps.event.trigger(map, "resize");
        map.setCenter(center);
        clearInterval(interval);
    };
    // Setup the click event listener
    google.maps.event.addDomListener(controlUI, "click", function () {
        if (!fullScreen) {
            controlDiv.goFullScreen();
        }
        else {
            controlDiv.exitFullScreen();
        }
    });
    return controlDiv;
}
