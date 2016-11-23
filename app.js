var express = require('express');
var bodyParser = require('body-parser');
var apiVersion = require('./package').version;
var fs = require('fs');
var wordService = require('./datastorage.js')
var path = require('path');
var app = express();
var DATADIR = 'data/'

app.set('port', process.env.PORT || 5001);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));

app.listen(app.get('port'), function() {
  console.log('Words mock server is running on port:' + app.get('port'));
});

app.get('/', function(req, res) {
  res.send('<html><body><h1>Words mock server http API! Version ' + apiVersion + '</h1></body></html>');
});

app.get('/data/:category/:word', function(req, res) {
  console.log('Lookign for a word' + req.params.word + ' from category ' + req.params.category)
  wordService.readWordFromCategory(req.params.category, req.params.word).then(function(word) {
    response(res, 200, word)
  },
  function(err) {
    response(res, 404, {'result':'category or word doesn`t exist in dictionary'})
  })
})

app.get('/data/:category', function(req, res) {
  console.log(req.method, req.path)
  console.log('Retrieving data for ' + req.params.category)
  wordService.readCategoryWords(req.params.category).then(
    function(filesArray) {
      response(res, 200, JSON.stringify(filesArray))
    },
    function(err) {
      if (err.code === 'ENOENT') {
        response(res, 404, {'result': 'Data was not found', 'err' : err})
      }
    })
})

app.get('/data/', function(req, res) {
  console.log(req.method, req.path);

  var name = req.path.replace('/' + apiVersion + '/', '/');
  var absPath = path.join(__dirname, name);

  fs.stat(absPath, function(err) {
    res.setHeader('content-type', 'application/json');

    if(err) {
      return response(res, 404, {'result': 'Data was not found'});
    }

    fs.readdir(absPath, function(err, data) {
      if(err) {
        return response(res, 404, {'result': 'Error durring preparing response'});
      }

      var result = [];
      data.map(function(file) {
        return path.join(absPath, file);
      }).filter(function(file) {
        return !fs.lstatSync(file).isDirectory();
      }).forEach(function(file) {
         try {
           console.log(file);
           var content = fs.readFileSync(file);
           result = result.concat(
             JSON.parse(content, 'utf-8')
           );
         } catch(err) {
           console.log(err);
         }
      });
      res.send(result);
    });
  });

});

app.post('/data/:category', function(req,res) {
  wordService.addWordsToCategory(req.params.category, req.body).then(

    function() {
      response(res, 200, {"status":'success'})
    },

    function(err) {
      console.log(err)
      response(res, 409, {"status" : "not applied"})
    }
  )
})

app.put('/data/' + apiVersion + '/:id', function(req, res) {
  console.log(req.method, req.path);

  var name = req.path.replace('/' + apiVersion + '/', '/').concat('.json');
  var absPath = path.join(__dirname, name);

  fs.stat(absPath, function(err) {
    res.setHeader('content-type', 'application/json');

    if(err) {
      return response(res, 404, {
        "status": "not applied",
        "err": err
      });
    }

    fs.writeFile(absPath, JSON.stringify(req.body), {'flag':'w'}, function(err) {
      if(err) {
        return response(res, 500, {"err": err});
      } else {
        return response(res, 200, {'status': 'success'});
      }
    });
  });
});

app.delete('/data/:category', function(req, res) {
  wordService.deleteCategory(req.params.category,
    function(err) {
      if (err) {
        response(res, 404, {'status':'not applied'})
      } else {
        response(res, 200, {'status':'success'} )
      }
    }
  )
});

app.delete('/data/:category/:word', function(req, resp) {
  wordService.deleteWord(req.params.category, req.params.word, function(err) {
    if (err) {
      response(resp, 404, {'status':'not applied'})
    } else {
      response(resp, 200, {'status':'success'})
    }

  })
})


function response(res, status, json) {
  return res.status(status).json(json);
}
