var _  = require("../libs/lodash.min.js")
var DataObject  = require("./DataObject.js")
var DataArray = require("./DataArray")
var $ = require("../libs/jquery-1.11.1.min.js")

function DataSource( name, def ){
  var root = this
  _.extend( this, _.defaults( def, {
    url : {
      collection : "/" + name+"/{action}",
      single: "/" + name+"/{id}/{action}"
    },
    pk : "id", //allow array
    publicDataSources : {},
    dataSourceMethods : {
      save : root.save.bind(root),
      delete : root.delete.bind(root),
      publish : root.publish.bind(root)
    }
  }))
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
  return this.interpolate( this.hasPrimaryKey(params )? this.url.single : this.url.collection, params).replace(/\/$/,"")
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
    if( /^\$\$/.test(k) ) delete result[k]
  })
  return result
}


DataSource.prototype.save = function( instance ){
  var root = this
  return this.query({
    url:root.makeUrl(instance),
    type: root.hasPrimaryKey(instance) ? "PUT" : "POST",
    data : root.makeData(instance)
  })
}

DataSource.prototype.delete = function( instance){
  var root = this
  return this.query({
    url:root.makeUrl(instance),
    type: "DELETE"
  })
}

DataSource.prototype.validate = function(instance){
  //TODO use schema to do validate
  instance.notify()
}

DataSource.prototype.publish = function( instance, name ){
  this.publicDataSources[name] = instance
  return instance
}

DataSource.prototype.get = function( params ){
  params = params ? (_.isObject(params) ? params : _.zipObject([this.pk],[params]) ) : {}
  var root = this
  var config = {methods:root.dataSourceMethods}
  var result = this.hasPrimaryKey(params) ? new DataObject(config) : new DataArray(config)

  this.query( {url:this.makeUrl(params),type:"GET",data:this.makeQuery(params)} ).then(function( res ){
    result.set( root.parse( res ) )
    result.notify()
  })

  return result
}

DataSource.prototype.new = function(){
  return new DataObject({methods:this.dataSourceMethods})
}


DataSource.prototype.receive = function(name){
  return this.publicDataSources[name]
}

DataSource.prototype.exec = function( action, params ){

}

module.exports = DataSource