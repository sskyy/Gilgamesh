//var _  = require("../libs/lodash.min.js")
var DataObject  = require("./DataObject.js")
var DataArray = require("./DataArray")
//var $ = require("../libs/jquery-1.11.1.min.js")

function DataSource( name, def ){
  _.extend( this, _.merge({
    url : {
      base : "",
      collection : "/" + name+"/{action}",
      single: "/" + name+"/{id}/{action}"
    },
    pk : "id", //TODO allow array
    publicDataSources : {},
    actions : {
      save : function( instance, params, dataSource ){
        return {
          url : dataSource.makeUrl( {id:instance.id} ),
          method : _.isUndefined( instance[dataSource.pk] ) ? "POST" : "PUT",
          data : instance.toObject()
        }
      },
      delete: function( instance,params, dataSource ){
        return {
          url : dataSource.makeUrl( {id:instance.id} ),
          method : _.isUndefined( instance[dataSource.pk] ) ? "POST" : "PUT",
          data : instance.toObject()
        }
      }

    }
  },def))
}



DataSource.prototype.query = function( settings ){
  return $.ajax(settings)
}

DataSource.prototype.parse = function( data ){
  return data
}

DataSource.prototype.interpolate = function( text, obj ){
  return text.replace(/(\{\w+\})/g, function( m ){ return obj[m.slice(1,m.length-1)] || "" })
}

DataSource.prototype.makeUrl = function( params ){
  return this.interpolate( this.url.base + (this.hasPrimaryKey(params )? this.url.single : this.url.collection), params).replace(/\/*\s*$/,"")
}


DataSource.prototype.hasPrimaryKey = function( params ){
  return !_.isObject( params ) || _.difference( [].concat(this.pk),  Object.keys(params)).length == 0
}


//we need to extract primary key from params
DataSource.prototype.makeQuery = function( params){
  var result = _.clone(_.isObject(params)?params:{})
  _.forEach([].concat(this.pk), function(r){
      delete result[r]
    })
  return result
}

DataSource.prototype.makeData = function( data ){
  var result = _.cloneDeep(data)
  _.forEach(result, function(v, k){
    if(_.isFunction(v) || /^\$\$/.test(k) ) delete result[k]
  })
  return result
}


DataSource.prototype.publish = function( instance, name ){
  this.publicDataSources[name] = instance
  return instance
}

DataSource.prototype.get = function( params ){
  params = params ? (_.isObject(params) ? params : _.zipObject([this.pk],[params]) ) : {}
  var root = this
  var config = {dataSource:root}
  var result = this.hasPrimaryKey(params) ? new DataObject(config) : new DataArray(config, params)

  this.query( {url:this.makeUrl(params),type:"GET",data:this.makeQuery(params)} ).then(function( res ){
    result.set( root.parse( res, root.hasPrimaryKey(params) ) )
  })

  return result
}

DataSource.prototype.new = function(){
  return new DataObject({dataSource:this})
}


DataSource.prototype.receive = function(name){
  return this.publicDataSources[name]
}

DataSource.prototype.generateAction = function( action ){
  var root = this
  return function( instanceOrCollections, params ){
    var def = _.isFunction(root.actions[action]) ?
      root.actions[action](instanceOrCollections,params,root) :
        _.isObject( root.actions[action] ) ?
          root.actions[action] :  {}


    var isBatch = instanceOrCollections instanceof DataArray

    return root.query(_.defaults( def , {
      url : root.interpolate(root.url[isBatch?"collection":"single"] ,{id:instanceOrCollections.id,action:action}),
      method : "PUT",
      data : _.extend( isBatch? _.zipObject([root.pk, instanceOrCollections.pluck("id") ]):{}, params)
    }))
  }
}

DataSource.prototype.action = function( action, defFn ){
  if( defFn ){
    this.actions[action] = defFn
  }
  return this.generateAction(action).bind(this)
}



DataObject.prototype.save = function( instance){
  return this.action("save")(instance)
}

DataObject.prototype.delete = function( instance){
  return this.action("delete")(instance)
}

module.exports = DataSource