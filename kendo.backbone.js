(function () {
var Model = kendo.data.Model,
    ObservableArray = kendo.data.ObservableArray;

function wrapBackboneModel(backboneModel, fields) {
    return Model.define({
        handlingEvent: false,
        fields: fields,

        defaultValues: {
            "string": "",
            "number": 0,
            "date": new Date(),
            "boolean": false,
            "default": ""
        },

        // Constructor
        init: function(model) {

            if (!(model instanceof backboneModel)) {
                model = new backboneModel(model);
            }

            // Retain a reference to the backbone model
            this.backbone = model;

            // Super
            Model.fn.init.call(this, model.toJSON());

            // Listen to all change events for the backbone model
            model.on("change", this.backboneChanged, this);

            // Listen to our own change event
            this.bind("change", this.kendoChanged);

            // Set any unspecified fields to their default values
            for (fieldName in fields) {
                field = fields[fieldName];
                if (!this.backbone.has(fieldName)) {
                    this.backbone.set(fieldName, field.defaultValue !== undefined ? field.defaultValue : this.defaultValues[field.type.toLowerCase()]);
                }
            }
        },

        // Destructor
        destroy: function() {
            // Stop listening to backbone events on the model
            model.off(null, null, this);

            // Call super
            Model.fn.destroy.call(this);
        },

        // When the backbone model has changed
        backboneChanged: function(model, options) {
            // Prevent reentrancy
            if (!this.handlingEvent) {
                this.handlingEvent = true;
                try {
                    // Get a copy of the model attributes that changed
                    var changed = model.changedAttributes();

                    // For each attribute that changed, update the kendo field
                    _.each(changed, function(value, key, list) {
                        this.set(key, value);
                    }, this);
                } finally {
                    this.handlingEvent = false;
                }
            }
        },

        kendoChanged: function(e) {
            // Prevent reentrancy
            if (!this.handlingEvent) {
                this.handlingEvent = true;
                try {
                    // Set the backbone field
                    this.backbone.set(e.field, this.get(e.field));
                } finally {
                    this.handlingEvent = false;
                }
            }
        }
    });
}

function wrapBackboneCollection(model) {
    return ObservableArray.extend( {
        handlingEvent: false,

        init: function(collection) {
            // Retain a reference to the backbone collection
            this.backbone = collection;

            // Call super
            ObservableArray.fn.init.call(this, this.backbone.models, model);

            // Listen to backbone events
            this.backbone.on("add", this.backboneAdded, this);
            this.backbone.on("remove", this.backboneRemoved, this);

            // Listen to our own change event
            this.bind("change", this.kendoChanged);
        },

        // Destructor
        destroy: function() {
            // Stop listening to backbone events
            this.backbone.off(null, null, this);

            // Call super
            ObservableArray.fn.destroy.call(this);
        },

        // When a model is added to the backbone collection
        backboneAdded: function(model) {
            // Prevent reentrancy
            if (!this.handlingEvent) {
                this.handlingEvent = true;
                try {
                    // Add it to the kendo array
                    var index = this.backbone.indexOf(model);
                    this.splice(index, 0, model);
                } finally {
                    this.handlingEvent = false;
                }
            }
        },

        // When a model is removed from the backbone collection
        backboneRemoved: function(model, collection, options) {
            // Prevent reentrancy
            if (!this.handlingEvent) {
                this.handlingEvent = true;
                try {
                    // Remove it from the kendo array
                    this.splice(options.index, 1);
                } finally {
                    this.handlingEvent = false;
                }
            }
        },

        // When models are changed in the kendo collection
        kendoChanged: function(e) {
            // Prevent reentrancy
            if (!this.handlingEvent) {
                this.handlingEvent = true;
                try {
                    // When models are added to the kendo collection
                    if (e.action === "add") {
                        // Add each model to the backbone collection
                        var index = e.index;
                        _.each(e.items, function(model) {
                            this.backbone.add(model.backbone, {at: index});
                            index++;
                        }, this)

                    // When models are removed from the kendo collection
                    } else if (e.action === "remove") {
                        // Remove each model from the backbone collection
                        _.each(e.items, function(model) {
                            this.backbone.remove(model.backbone);
                        }, this)
                    }
                } finally {
                    this.handlingEvent = false;
                }
            }
        }
    });
}

kendo.backboneCollection = wrapBackboneCollection;
kendo.backboneModel = wrapBackboneModel;
})();
