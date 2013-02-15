(function () {
var Model = kendo.data.Model,
    ObservableArray = kendo.data.ObservableArray;
    defaultValues = {
        "string": "",
        "number": 0,
        "date": new Date(),
        "boolean": false,
        "default": ""
    };


function wrapBackboneModel(BackboneModel, options) {
    options = options || { id: "id" };
    if ((typeof options.fields === "undefined") || (options.fields === null) || (options.fields.length < 1)) {
        throw new "options.fields is required"
    }

    return Model.define({
        fields: options.fields,
        id: options.id,

        // Constructor
        init: function(model) {
            var that = this;

            if (!(model instanceof BackboneModel)) {
              model = new BackboneModel(model);
            }

            // Retain a reference to the backbone model
            that.backbone = model;

            // Super
            Model.fn.init.call(that, model.toJSON());

            // Listen to all change events for the backbone model
            that.backbone.on("change", that.backboneChanged, that);

            // Listen to our own change event
            that.bind("change", that.kendoChanged);

            // Set any unspecified fields to their default values
            var fieldName;
            for (fieldName in that.fields) {
                var field = that.fields[fieldName];
                if (!that.backbone.has(fieldName)) {
                    that.backbone.set(fieldName, field.defaultValue !== undefined ? field.defaultValue : defaultValues[field.type.toLowerCase()]);
                }
            }
        },

        // Destructor
        destroy: function() {
            var that = this;

            // Stop listening to backbone events on the model
            that.backbone.off(null, null, that);

            // Call super
            Model.fn.destroy.call(that);
        },

        // When the backbone model has changed
        backboneChanged: function(model, options) {
            var that = this;

            options = options || {};
            var ignore = options.ignoreBBChanged || false;
            if (!ignore) {
                // Get a copy of the model attributes that changed
                var changed = model.changedAttributes();

                // For each attribute that changed, update the kendo field
                _.each(changed, function(value, key, list) {
                    that.set(key, value);
                });
            }
        },

        kendoChanged: function(e) {
            var that = this;

            // Set the backbone field
            that.backbone.set(e.field, that.get(e.field), { ignoreBBChanged: true });
        }
    });
}

function wrapBackboneCollection(ModelWrapper) {
    return ObservableArray.extend( {
        init: function(collection) {
            var that = this;

            // Retain a reference to the backbone collection
            that.backbone = collection;

            // Call super
            ObservableArray.fn.init.call(that, that.backbone.models, ModelWrapper);

            // Listen to backbone events
            that.backbone.on("add", that.backboneAdded, that);
            that.backbone.on("remove", that.backboneRemoved, that);

            // Listen to our own change event
            that.bind("change", that.kendoChanged);
        },

        // Destructor
        destroy: function() {
            var that = this;

            // Stop listening to backbone events
            that.backbone.off(null, null, that);

            // Call super
            ObservableArray.fn.destroy.call(that);
        },

        // When a model is added to the backbone collection
        backboneAdded: function(model, collection, options) {
            var that = this;
            options = options || {};
            var ignore = options.ignoreBBAdded || false;
            if (!ignore) {
                // Add it to the kendo array
                var index = that.backbone.indexOf(model);
                that.splice(index, 0, model);
            }
        },

        // When a model is removed from the backbone collection
        backboneRemoved: function(model, collection, options) {
            var that = this;
            options = options || {};
            var ignore = options.ignoreBBRemoved || false;
            if (!ignore) {
                // Remove it from the kendo array
                that.splice(options.index, 1);
            }
        },

        // When models are changed in the kendo collection
        kendoChanged: function(e) {
            var that = this;

            // When models are added to the kendo collection
            if (e.action === "add") {
                // Add each model to the backbone collection
                var index = e.index;
                _.each(e.items, function(model) {
                    that.backbone.add(model.backbone, {at: index, ignoreBBAdded: true});
                    index++;
                })

            // When models are removed from the kendo collection
            } else if (e.action === "remove") {
                // Remove each model from the backbone collection
                _.each(e.items, function(model) {
                    that.backbone.remove(model.backbone, {ignoreBBRemoved: true});
                })
            }
        }
    });
}

kendo.backboneCollection = wrapBackboneCollection;
kendo.backboneModel = wrapBackboneModel;
})();
