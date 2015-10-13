Ext.define('CustomApp', {
  extend: 'Rally.app.App',
  componentCls: 'app',

  launch() {
    this.add([{
      xtype: 'container',
      layout: 'hbox',
      items: [{
        xtype: 'rallyiterationcombobox',
        id: 'iteration-picker',
        listeners: {
          change: () => this._onSnapshotCriteriaChange()
        }
      },{
        xtype: 'container',
        flex: 1
      },{
        xtype: 'datefield',
        id: 'date-picker',
        fieldLabel: 'Snapshot Date',
        labelAlign: 'right',
        value: new Date(),
        listeners: {
          change: () => this._onSnapshotCriteriaChange()
        }
      }]
    },{
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
        },{
          dataIndex: 'Name'
        },{
          dataIndex: 'ScheduleState',
          renderer: _.identity,
          width: 100
        }]
      }]
    }]);
  },

  _onSnapshotCriteriaChange() {
    const iterationPicker = Ext.getCmp('iteration-picker');
    const iterationName = iterationPicker.getRawValue();

    const datePicker = Ext.getCmp('date-picker');
    const queryDate = datePicker.getValue();
    queryDate.setHours(23, 59, 59);

    this._setGridLoading(true);

    this._getIterationOIDs(iterationName)
      .then(_.partial(this._getSnapshots, queryDate))
      .then(this._updateGridSnapshots)
      .then(() => this._setGridLoading(false));
  },

  _getIterationOIDs(iterationName) {
    const promise = Ext.create('Deft.Deferred');

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
        load: (store, iterations) => promise.resolve(_.map(iterations, iteration => iteration.get('ObjectID')))
      }
    });

    return promise;
  },

  _getSnapshots(queryDate, iterationOIDs) {
    const promise = Ext.create('Deft.Deferred');

    Ext.create('Rally.data.lookback.SnapshotStore', {
      autoLoad: true,
      fetch: ['FormattedID', 'Name', 'ScheduleState'],
      filters: [{
        property: '__At',
        value: Rally.util.DateTime.toIsoString(queryDate)
      },{
        property: '_TypeHierarchy',
        operator: 'in',
        value: ['Defect', 'HierarchicalRequirement']
      },{
        property: 'Iteration',
        operator: 'in',
        value: iterationOIDs
      }],
      hydrate: ['ScheduleState'],
      limit: Infinity,
      removeUnauthorizedSnapshots: true,
      listeners: {
        load: (store) => promise.resolve(store)
      }
    });

    return promise;
  },

  _setGridLoading(isLoading) {
    const grid = Ext.getCmp('grid');
    grid.setLoading(isLoading);
  },

  _updateGridSnapshots(store) {
    const grid = Ext.getCmp('grid');
    grid.bindStore(store);
  }
});
