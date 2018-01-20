"use strict";
if (L.Browser.svg) {
    L.Path.include({
        _resetTransform: function () {
            this._container.setAttributeNS(null, "transform", "")
        }, _applyTransform: function (t) {
            this._container.setAttributeNS(null, "transform", "matrix(" + t.join(" ") + ")")
        }
    })
} else {
    L.Path.include({
        _resetTransform: function () {
            if (this._skew) {
                this._skew.on = false;
                this._container.removeChild(this._skew);
                this._skew = null
            }
        }, _applyTransform: function (t) {
            var e = this._skew;
            if (!e) {
                e = this._createElement("skew");
                this._container.appendChild(e);
                e.style.behavior = "url(#default#VML)";
                this._skew = e
            }
            var i = t[0].toFixed(8) + " " + t[1].toFixed(8) + " " + t[2].toFixed(8) + " " + t[3].toFixed(8) + " 0 0";
            var a = Math.floor(t[4]).toFixed() + ", " + Math.floor(t[5]).toFixed() + "";
            var r = this._container.style;
            var s = parseFloat(r.left);
            var o = parseFloat(r.top);
            var n = parseFloat(r.width);
            var h = parseFloat(r.height);
            if (isNaN(s)) s = 0;
            if (isNaN(o)) o = 0;
            if (isNaN(n) || !n) n = 1;
            if (isNaN(h) || !h) h = 1;
            var _ = (-s / n - .5).toFixed(8) + " " + (-o / h - .5).toFixed(8);
            e.on = "f";
            e.matrix = i;
            e.origin = _;
            e.offset = a;
            e.on = true
        }
    })
}
L.Path.include({
    _onMouseClick: function (t) {
        if (this.dragging && this.dragging.moved() || this._map.dragging && this._map.dragging.moved()) {
            return
        }
        this._fireMouseEvent(t)
    }
});
"use strict";
L.Handler.PathDrag = L.Handler.extend({
    statics: {DRAGGABLE_CLS: "leaflet-path-draggable"}, initialize: function (t) {
        this._path = t;
        this._matrix = null;
        this._startPoint = null;
        this._dragStartPoint = null;
        this._dragInProgress = false
    }, addHooks: function () {
        var t = L.Handler.PathDrag.DRAGGABLE_CLS;
        var e = this._path._path;
        this._path.on("mousedown", this._onDragStart, this);
        this._path.options.className = (this._path.options.className || "") + " " + t;
        if (!L.Path.CANVAS && e) {
            L.DomUtil.addClass(e, t)
        }
    }, removeHooks: function () {
        var t = L.Handler.PathDrag.DRAGGABLE_CLS;
        var e = this._path._path;
        this._path.off("mousedown", this._onDragStart, this);
        this._path.options.className = (this._path.options.className || "").replace(t, "");
        if (!L.Path.CANVAS && e) {
            L.DomUtil.removeClass(e, t)
        }
    }, moved: function () {
        return this._path._dragMoved
    }, inProgress: function () {
        return this._dragInProgress
    }, _onDragStart: function (t) {
        this._dragInProgress = true;
        this._startPoint = t.containerPoint.clone();
        this._dragStartPoint = t.containerPoint.clone();
        this._matrix = [1, 0, 0, 1, 0, 0];
        this._path._map.on("mousemove", this._onDrag, this).on("mouseup", this._onDragEnd, this);
        this._path._dragMoved = false
    }, _onDrag: function (t) {
        var e = t.containerPoint.x;
        var i = t.containerPoint.y;
        var a = e - this._startPoint.x;
        var r = i - this._startPoint.y;
        if (!this._path._dragMoved && (a || r)) {
            this._path._dragMoved = true;
            this._path.fire("dragstart");
            if (this._path._popup) {
                this._path._popup._close();
                this._path.off("click", this._path._openPopup, this._path)
            }
        }
        this._matrix[4] += a;
        this._matrix[5] += r;
        this._startPoint.x = e;
        this._startPoint.y = i;
        this._path._applyTransform(this._matrix);
        this._path.fire("drag");
        L.DomEvent.stop(t.originalEvent)
    }, _onDragEnd: function (t) {
        L.DomEvent.stop(t);
        this._dragInProgress = false;
        this._path._resetTransform();
        this._transformPoints(this._matrix);
        this._path._map.off("mousemove", this._onDrag, this).off("mouseup", this._onDragEnd, this);
        this._path.fire("dragend", {distance: Math.sqrt(L.LineUtil._sqDist(this._dragStartPoint, t.containerPoint))});
        if (this._path._popup) {
            L.Util.requestAnimFrame(function () {
                this._path.on("click", this._path._openPopup, this._path)
            }, this)
        }
        this._matrix = null;
        this._startPoint = null;
        this._dragStartPoint = null;
        this._path._dragMoved = false
    }, _transformPoint: function (t, e) {
        var i = this._path;
        var a = L.point(e[4], e[5]);
        var r = i._map.options.crs;
        var s = r.transformation;
        var o = r.scale(i._map.getZoom());
        var n = r.projection;
        var h = s.untransform(a, o).subtract(s.untransform(L.point(0, 0), o));
        return n.unproject(n.project(t)._add(h))
    }, _transformPoints: function (t) {
        var e = this._path;
        var i, a, r;
        var s = L.point(t[4], t[5]);
        var o = e._map.options.crs;
        var n = o.transformation;
        var h = o.scale(e._map.getZoom());
        var _ = o.projection;
        var g = n.untransform(s, h).subtract(n.untransform(L.point(0, 0), h));
        if (e._point) {
            e._latlng = _.unproject(_.project(e._latlng)._add(g));
            e._point._add(s)
        } else if (e._originalPoints) {
            for (i = 0, a = e._originalPoints.length; i < a; i++) {
                r = e._latlngs[i];
                e._latlngs[i] = _.unproject(_.project(r)._add(g));
                e._originalPoints[i]._add(s)
            }
        }
        if (e._holes) {
            for (i = 0, a = e._holes.length; i < a; i++) {
                for (var p = 0, d = e._holes[i].length; p < d; p++) {
                    r = e._holes[i][p];
                    e._holes[i][p] = _.unproject(_.project(r)._add(g));
                    e._holePoints[i][p]._add(s)
                }
            }
        }
        e._updatePath()
    }
});
L.Path.addInitHook(function () {
    if (this.options.draggable) {
        if (this.dragging) {
            this.dragging.enable()
        } else {
            this.dragging = new L.Handler.PathDrag(this);
            this.dragging.enable()
        }
    } else if (this.dragging) {
        this.dragging.disable()
    }
});
L.Circle.prototype._getLatLng = L.Circle.prototype.getLatLng;
L.Circle.prototype.getLatLng = function () {
    if (this.dragging && this.dragging.inProgress()) {
        return this.dragging._transformPoint(this._latlng, this.dragging._matrix)
    } else {
        return this._getLatLng()
    }
};
L.Polyline.prototype._getLatLngs = L.Polyline.prototype.getLatLngs;
L.Polyline.prototype.getLatLngs = function () {
    if (this.dragging && this.dragging.inProgress()) {
        var t = this.dragging._matrix;
        var e = this._getLatLngs();
        for (var i = 0, a = e.length; i < a; i++) {
            e[i] = this.dragging._transformPoint(e[i], t)
        }
        return e
    } else {
        return this._getLatLngs()
    }
};
(function () {
    L.FeatureGroup.EVENTS += " dragstart";

    function t(t, e, i) {
        for (var a = 0, r = t.length; a < r; a++) {
            var s = t[a];
            s.prototype["_" + e] = s.prototype[e];
            s.prototype[e] = i
        }
    }

    function e(t) {
        if (this.hasLayer(t)) {
            return this
        }
        t.on("drag", this._onDrag, this).on("dragend", this._onDragEnd, this);
        return this._addLayer.call(this, t)
    }

    function i(t) {
        if (!this.hasLayer(t)) {
            return this
        }
        t.off("drag", this._onDrag, this).off("dragend", this._onDragEnd, this);
        return this._removeLayer.call(this, t)
    }

    t([L.MultiPolygon, L.MultiPolyline], "addLayer", e);
    t([L.MultiPolygon, L.MultiPolyline], "removeLayer", i);
    var a = {
        _onDrag: function (t) {
            var e = t.target;
            this.eachLayer(function (t) {
                if (t !== e) {
                    t._applyTransform(e.dragging._matrix)
                }
            });
            this._propagateEvent(t)
        }, _onDragEnd: function (t) {
            var e = t.target;
            this.eachLayer(function (t) {
                if (t !== e) {
                    t._resetTransform();
                    t.dragging._transformPoints(e.dragging._matrix)
                }
            });
            this._propagateEvent(t)
        }
    };
    L.MultiPolygon.include(a);
    L.MultiPolyline.include(a)
})();
L.Polygon.include(L.Polygon.prototype.getCenter ? {} : {
    getCenter: function () {
        var t, e, i, a, r, s, o, n, h;
        var _ = this._originalPoints;
        o = n = h = 0;
        for (t = 0, i = _.length, e = i - 1; t < i; e = t++) {
            a = _[t];
            r = _[e];
            s = a.y * r.x - r.y * a.x;
            n += (a.x + r.x) * s;
            h += (a.y + r.y) * s;
            o += s * 3
        }
        return this._map.layerPointToLatLng([n / o, h / o])
    }
});
"use strict";
L.EditToolbar.Edit.MOVE_MARKERS = false;
L.EditToolbar.Edit.include({
    initialize: function (t, e) {
        L.EditToolbar.Edit.MOVE_MARKERS = !!e.selectedPathOptions.moveMarkers;
        this._initialize(t, e)
    }, _initialize: L.EditToolbar.Edit.prototype.initialize
});
L.Edit.SimpleShape.include({
    _updateMoveMarker: function () {
        if (this._moveMarker) {
            this._moveMarker.setLatLng(this._getShapeCenter())
        }
    }, _getShapeCenter: function () {
        return this._shape.getBounds().getCenter()
    }, _createMoveMarker: function () {
        if (L.EditToolbar.Edit.MOVE_MARKERS) {
            this._moveMarker = this._createMarker(this._getShapeCenter(), this.options.moveIcon)
        }
    }
});
L.Edit.SimpleShape.mergeOptions({moveMarker: false});
L.Edit.Circle.include({
    addHooks: function () {
        if (this._shape._map) {
            this._map = this._shape._map;
            if (!this._markerGroup) {
                this._enableDragging();
                this._initMarkers()
            }
            this._shape._map.addLayer(this._markerGroup)
        }
    }, removeHooks: function () {
        if (this._shape._map) {
            for (var t = 0, e = this._resizeMarkers.length; t < e; t++) {
                this._unbindMarker(this._resizeMarkers[t])
            }
            this._disableDragging();
            this._resizeMarkers = null;
            this._map.removeLayer(this._markerGroup);
            delete this._markerGroup
        }
        this._map = null
    }, _createMoveMarker: L.Edit.SimpleShape.prototype._createMoveMarker, _resize: function (t) {
        var e = this._shape.getLatLng();
        var i = e.distanceTo(t);
        this._shape.setRadius(i);
        this._updateMoveMarker()
    }, _enableDragging: function () {
        if (!this._shape.dragging) {
            this._shape.dragging = new L.Handler.PathDrag(this._shape)
        }
        this._shape.dragging.enable();
        this._shape.on("dragstart", this._onStartDragFeature, this).on("dragend", this._onStopDragFeature, this)
    }, _disableDragging: function () {
        this._shape.dragging.disable();
        this._shape.off("dragstart", this._onStartDragFeature, this).off("dragend", this._onStopDragFeature, this)
    }, _onStartDragFeature: function () {
        this._shape._map.removeLayer(this._markerGroup);
        this._shape.fire("editstart")
    }, _onStopDragFeature: function () {
        var t = this._shape.getLatLng();
        this._resizeMarkers[0].setLatLng(this._getResizeMarkerPoint(t));
        this._shape._map.addLayer(this._markerGroup);
        this._updateMoveMarker();
        this._fireEdit()
    }
});
L.Edit.Rectangle.include({
    addHooks: function () {
        if (this._shape._map) {
            if (!this._markerGroup) {
                this._enableDragging();
                this._initMarkers()
            }
            this._shape._map.addLayer(this._markerGroup)
        }
    }, removeHooks: function () {
        if (this._shape._map) {
            this._shape._map.removeLayer(this._markerGroup);
            this._disableDragging();
            delete this._markerGroup;
            delete this._markers
        }
    }, _resize: function (t) {
        this._shape.setBounds(L.latLngBounds(t, this._oppositeCorner));
        this._updateMoveMarker()
    }, _onMarkerDragEnd: function (t) {
        this._toggleCornerMarkers(1);
        this._repositionCornerMarkers();
        L.Edit.SimpleShape.prototype._onMarkerDragEnd.call(this, t)
    }, _enableDragging: function () {
        if (!this._shape.dragging) {
            this._shape.dragging = new L.Handler.PathDrag(this._shape)
        }
        this._shape.dragging.enable();
        this._shape.on("dragstart", this._onStartDragFeature, this).on("dragend", this._onStopDragFeature, this)
    }, _disableDragging: function () {
        this._shape.dragging.disable();
        this._shape.off("dragstart", this._onStartDragFeature, this).off("dragend", this._onStopDragFeature, this)
    }, _onStartDragFeature: function () {
        this._shape._map.removeLayer(this._markerGroup);
        this._shape.fire("editstart")
    }, _onStopDragFeature: function () {
        var t = this._shape;
        for (var e = 0, i = t._latlngs.length; e < i; e++) {
            var a = this._resizeMarkers[e];
            a.setLatLng(t._latlngs[e]);
            a._origLatLng = t._latlngs[e];
            if (a._middleLeft) {
                a._middleLeft.setLatLng(this._getMiddleLatLng(a._prev, a))
            }
            if (a._middleRight) {
                a._middleRight.setLatLng(this._getMiddleLatLng(a, a._next))
            }
        }
        this._shape._map.addLayer(this._markerGroup);
        this._updateMoveMarker();
        this._repositionCornerMarkers();
        this._fireEdit()
    }
});
L.Edit.Poly.include({
    __createMarker: L.Edit.Poly.prototype._createMarker,
    __removeMarker: L.Edit.Poly.prototype._removeMarker,
    addHooks: function () {
        if (this._poly._map) {
            if (!this._markerGroup) {
                this._enableDragging();
                this._initMarkers();
                this._createMoveMarker()
            }
            this._poly._map.addLayer(this._markerGroup)
        }
    },
    _createMoveMarker: function () {
        if (L.EditToolbar.Edit.MOVE_MARKERS && this._poly instanceof L.Polygon) {
            this._moveMarker = new L.Marker(this._getShapeCenter(), {icon: this.options.moveIcon});
            this._moveMarker.on("mousedown", this._delegateToShape, this);
            this._markerGroup.addLayer(this._moveMarker)
        }
    },
    _delegateToShape: function (t) {
        var e = this._shape || this._poly;
        var i = t.target;
        e.fire("mousedown", L.Util.extend(t, {containerPoint: L.DomUtil.getPosition(i._icon).add(e._map._getMapPanePos())}))
    },
    _getShapeCenter: function () {
        return this._poly.getCenter()
    },
    removeHooks: function () {
        if (this._poly._map) {
            this._poly._map.removeLayer(this._markerGroup);
            this._disableDragging();
            delete this._markerGroup;
            delete this._markers
        }
    },
    _enableDragging: function () {
        if (!this._poly.dragging) {
            this._poly.dragging = new L.Handler.PathDrag(this._poly)
        }
        this._poly.dragging.enable();
        this._poly.on("dragstart", this._onStartDragFeature, this).on("dragend", this._onStopDragFeature, this)
    },
    _disableDragging: function () {
        this._poly.dragging.disable();
        this._poly.off("dragstart", this._onStartDragFeature, this).off("dragend", this._onStopDragFeature, this)
    },
    _onStartDragFeature: function (t) {
        this._poly._map.removeLayer(this._markerGroup);
        this._poly.fire("editstart")
    },
    _onStopDragFeature: function (t) {
        var e = this._poly;
        for (var i = 0, a = e._latlngs.length; i < a; i++) {
            var r = this._markers[i];
            r.setLatLng(e._latlngs[i]);
            r._origLatLng = e._latlngs[i];
            if (r._middleLeft) {
                r._middleLeft.setLatLng(this._getMiddleLatLng(r._prev, r))
            }
            if (r._middleRight) {
                r._middleRight.setLatLng(this._getMiddleLatLng(r, r._next))
            }
        }
        this._poly._map.addLayer(this._markerGroup);
        L.Edit.SimpleShape.prototype._updateMoveMarker.call(this);
        this._fireEdit()
    },
    _updateMoveMarker: L.Edit.SimpleShape.prototype._updateMoveMarker,
    _createMarker: function (t, e) {
        var i = this.__createMarker(t, e);
        i.on("dragstart", this._hideMoveMarker, this).on("dragend", this._showUpdateMoveMarker, this);
        return i
    },
    _removeMarker: function (t) {
        this.__removeMarker(t);
        t.off("dragstart", this._hideMoveMarker, this).off("dragend", this._showUpdateMoveMarker, this)
    },
    _hideMoveMarker: function () {
        if (this._moveMarker) {
            this._markerGroup.removeLayer(this._moveMarker)
        }
    },
    _showUpdateMoveMarker: function () {
        if (this._moveMarker) {
            this._markerGroup.addLayer(this._moveMarker);
            this._updateMoveMarker()
        }
    }
});
L.Edit.Poly.prototype.options.moveIcon = new L.DivIcon({
    iconSize: new L.Point(8, 8),
    className: "leaflet-div-icon leaflet-editing-icon leaflet-edit-move"
});
L.Edit.Poly.mergeOptions({moveMarker: false});