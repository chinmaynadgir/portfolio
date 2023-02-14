define([
    'jquery',
    'lodash',
    'oui',
    'localizer'
], function ($, _, oui, localizer) {
    'use strict';

    // double picker configuration options
    var PICKER_OPTIONS = {
        shared : {
            viewFns : {
                display : function (data) {
                    return data.name;
                }
            }
        },
        source : {
            search : true,
            drag : {
                enabled : true,
                out : 'ignore',
                over : 'ignore'
            },
            tree : {
                multiSelect : true,
                defaultFilterFields : ['name'],
                storeFns : {
                    attrs : function (node) {
                        // if it's not a leaf node, make sure it can't be selected and that it's expanded by default.
                        if (node.children) {
                            return ['unselectable', 'expanded'];
                        }
                    }
                }
            }
        },
        dest : {
            drag : {
                enabled : true,
                out : 'ignore',
                over : 'ignore'
            }
        },
        allowReordering : true,
        labels : {
            source : localizer.getString('label.global_available'),
            dest : localizer.getString('label.global_selected')
        }
    };

    // double picker data
    var PICKER_DATA = {
        available : [],
        selected : []
    };

    function MeasureSettingsView ($tab, Controller, options) {
        this._$el = $tab;
        this._controller = Controller;
        this.options = options;
        this.init();
    }

    MeasureSettingsView.prototype = {
        constructor : MeasureSettingsView,

        init : function () {
            this.picker = new oui.DoublePicker(PICKER_OPTIONS, null, PICKER_DATA);
            this._$el.append(this.picker.getElement());
            this.initListeners();
            this.shown();
        },

        initListeners : function () {
            var that = this;

            this.picker.on('nodes-selected nodes-deselected', function () {
                that.markTabDirty();
            });

            this.picker.dest().on('node-moved', function () {
                that.markTabDirty();
            });
        },

        markTabDirty : function () {
            this._controller.markTabDirty();
        },

        getSaveData : function () {
            return this.picker.selected();
        },

        shown : function () {
            if (this.options && _.isArray(this.options.available)) {
                this.picker.available(this.options.available);
            }
            if (this.options && _.isArray(this.options.selected)) {
                this.picker.selected(this.options.selected);
            }
            this.picker.init();
        }
    };

    return MeasureSettingsView;
});
