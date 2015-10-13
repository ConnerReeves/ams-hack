'use strict';

Ext.define('CustomApp', {
  extend: 'Rally.app.App',
  componentCls: 'app',

  launch: function launch() {
    var _this = this;

    this.add([{
      xtype: 'container',
      layout: 'hbox',
      items: [{
        xtype: 'rallyiterationcombobox',
        id: 'iteration-picker',
        listeners: {
          change: function change() {
            return _this._onSnapshotCriteriaChange();
          }
        }
      }, {
        xtype: 'container',
        flex: 1
      }, {
        xtype: 'datefield',
        id: 'date-picker',
        fieldLabel: 'Snapshot Date',
        labelAlign: 'right',
        value: new Date(),
        listeners: {
          change: function change() {
            return _this._onSnapshotCriteriaChange();
          }
        }
      }]
    }, {
      xtype: 'container',
      layout: 'fit',
      items: [{
        xtype: 'rallygrid',
        id: 'grid',
        showPagingToolbar: false,
        showRowActionsColumn: false,
        sortableColumns: false,
        storeConfig: {
          autoLoad: false,
          models: ['Defect', 'UserStory']
        },
        columnCfgs: [{
          dataIndex: 'FormattedID',
          renderer: _.identity,
          width: 60
        }, {
          dataIndex: 'Name'
        }, {
          dataIndex: 'ScheduleState',
          renderer: _.identity,
          width: 100
        }]
      }]
    }]);
  },

  _onSnapshotCriteriaChange: function _onSnapshotCriteriaChange() {
    var _this2 = this;

    var iterationPicker = Ext.getCmp('iteration-picker');
    var iterationName = iterationPicker.getRawValue();

    var datePicker = Ext.getCmp('date-picker');
    var queryDate = datePicker.getValue();
    queryDate.setHours(23, 59, 59);

    this._setGridLoading(true);

    this._getIterationOIDs(iterationName).then(_.partial(this._getSnapshots, queryDate)).then(this._updateGridSnapshots).then(function () {
      return _this2._setGridLoading(false);
    });
  },

  _getIterationOIDs: function _getIterationOIDs(iterationName) {
    var promise = Ext.create('Deft.Deferred');

    Ext.create('Rally.data.wsapi.Store', {
      autoLoad: true,
      fetch: ['ObjectID'],
      filters: [{
        property: 'Name',
        value: iterationName
      }],
      limit: Infinity,
      model: 'Iteration',
      listeners: {
        load: function load(store, iterations) {
          return promise.resolve(_.map(iterations, function (iteration) {
            return iteration.get('ObjectID');
          }));
        }
      }
    });

    return promise;
  },

  _getSnapshots: function _getSnapshots(queryDate, iterationOIDs) {
    var promise = Ext.create('Deft.Deferred');

    Ext.create('Rally.data.lookback.SnapshotStore', {
      autoLoad: true,
      fetch: ['FormattedID', 'Name', 'ScheduleState'],
      filters: [{
        property: '__At',
        value: Rally.util.DateTime.toIsoString(queryDate)
      }, {
        property: '_TypeHierarchy',
        operator: 'in',
        value: ['Defect', 'HierarchicalRequirement']
      }, {
        property: 'Iteration',
        operator: 'in',
        value: iterationOIDs
      }],
      hydrate: ['ScheduleState'],
      limit: Infinity,
      removeUnauthorizedSnapshots: true,
      listeners: {
        load: function load(store) {
          return promise.resolve(store);
        }
      }
    });

    return promise;
  },

  _setGridLoading: function _setGridLoading(isLoading) {
    var grid = Ext.getCmp('grid');
    grid.setLoading(isLoading);
  },

  _updateGridSnapshots: function _updateGridSnapshots(store) {
    var grid = Ext.getCmp('grid');
    grid.bindStore(store);
  }
});