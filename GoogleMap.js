/*global google,window,com*/
/*eslint-disable no-alert, no-console, dot-notation*/

sap.ui.core.Control.extend("com.sap.mohawk.GoogleMap", {
    metadata: {
        properties: {
            height: "string",
            width: "string",
            enableControls: "boolean"
        },
        aggregations: {
            markers: { type: "com.sap.mohawk.GoogleMapMarker", multiple: true }
        },
        defaultAggregation: "markers"
    },

    init: function () {
        this._markers = [];
    },

    renderer: function (renderManger, control) {
        var width = control.getWidth() || "600px",
            height = control.getHeight() || "400px";

        console.log("Google map render..");

        renderManger.write("<div");
        renderManger.writeControlData(control);
        renderManger.writeClasses();

        renderManger.addStyle("width", width);
        renderManger.addStyle("height", height);
        renderManger.addStyle("overflow", "hidden");
        renderManger.writeStyles();

        renderManger.write(">");
        renderManger.write("</div>");

    },

    onAfterRendering: function () {
        console.log("After Rendering Google map...");
        var controller = this;

        if(!window["google"]) {
            console.log("Loading google API script...");
            var url = "https://www.google.com/jsapi?sensor=false";
            $.getScript(url)
                .done(function() {
                    console.log("Google API script loaded. Loading maps...");
                    google.load("maps", "3.6", {
                        "other_params":"sensor=false",
                        "callback" : function(){
                            console.log("Google Maps API loaded.");
                            controller._apiLoaded = true;
                            controller._loadGoogleMap();
                        }
                    });
                })
                .error(function(){
                    alert("Failed to load google API");
                });
        } else {
            console.log("Google Maps API already loaded.");
            controller._loadGoogleMap();
        }
    },

    center: function (latitude, longitude, number) {
        var marker;

        this._map.setCenter(new google.maps.LatLng(latitude, longitude));
        this._map.setZoom(16);

        this._closeAllInfoWindows();

        for (var i = 0; i < this._markers.length; i++) {
            if (this._markers[i].metadata.number === number) {
                marker = this._markers[i];
                break;
            }
        }

        if (marker) {
            google.maps.event.trigger(marker, "click");
        }
    },

    _loadGoogleMap : function(){
        if(!this._apiLoaded){
            return;
        }

        console.log("Loading Google Maps control...");
        var markers = this.getMarkers(),
            mapMarker,
            marker,
            options = {
                mapTypeId: "roadmap",
                disableDefaultUI: !this.getEnableControls(),
                zoom: 15
            },
            markerPosition;

        this._map = new google.maps.Map(jQuery.sap.domById(this.getId()), options);

        this._clearMarkers();

        this._infoWindows = [];

        for (var i = 0; i < markers.length; i++) {

            marker = markers[i];

            markerPosition = new google.maps.LatLng(marker.getLatitude(), marker.getLongitude());

            mapMarker = new google.maps.Marker({
                position: markerPosition,
                map: this._map,
                metadata: { number: marker.getNumber()},
                optimized: false
            });

            if (i === 0) {
                console.log("Centering Map...");
                this._map.setCenter(markerPosition);
            }

            this._markers.push(mapMarker);
            this._addInfoWindow(mapMarker, this._getInfoWindowData(marker));
        }
    },

    resize : function(){
        google.maps.event.trigger(this._map, "resize");
    },

    resizeAndCenterOnMarker : function(index){
        index = index || 0;

        if(!this._map){
            console.log("resizeAndCenterOnFirstMarker - map not avaialble");
            return;
        }

        this.resize();

        if(this._markers.length > 0){
            console.log("Centering map on resize");
            this._map.setCenter(this._markers[index].getPosition());
        }
    },

    openMarker : function(index){
        var mapMarker = this._markers[index];

        if(mapMarker){
            google.maps.event.trigger(mapMarker, "click");
        }

    },

    exit: function () {
        console.log("Cleaning up map resources");
        delete this._map;
        $("#" + this.getId()).remove();
    },

    _clearMarkers: function () {
        for (var i = 0; i < this._markers.length; i++) {
            this._markers[i].setMap(null);
        }
        this._markers.length = 0;
    },

    _addInfoWindow: function (mapMarker, content) {
        if (!content) {
            console.log("No marker content: " + content);
            return;
        }

        var that = this,
            map = this._map,
            infoWindow = new google.maps.InfoWindow({
                content: content
            });

        this._infoWindows.push(infoWindow);

        google.maps.event.addListener(mapMarker, "click", function () {
            that._closeAllInfoWindows();
            infoWindow.open(map, mapMarker);
        });
    },

    _getInfoWindowData: function (marker) {
        var templateId = marker.getTemplateId(),
            paramsString = marker.getTemplateParameters(),
            template = $("#" + templateId).html(),
            params;

        if (templateId) {
            if (paramsString) {
                params = paramsString.split(",");
                template = this._formatTemplate(template, params, marker.getBindingContext().getPath());
            }

            return template;
        }
    },

    _formatTemplate: function (template, params, context) {
        var formatted = template.replace(/{(\d+)}/g, function (match, number) {
            return typeof params[number] !== "undefined"  ? params[number] : match;
        });

        return formatted.replace("{context}", context);
    },

    _closeAllInfoWindows: function () {
        for (var i = 0; i < this._infoWindows.length; i++) {
            this._infoWindows[i].close();
        }
    }

});
