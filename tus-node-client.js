#!/usr/bin/env node

var path = require('path');
var fs = require('fs');
var request = require('request');
var async = require('async');
var util = require('util');
var mime = require('mime');

var args = process.argv;

if (args.length < 4) {
    console.log("Usage:", path.basename(args[1]), "file http://localhost:1080/files/");
    process.exit(1);
}

var uploadFilePath = args[2];
var uploadURL = args[3];
var chunkSize = 1024;

fs.stat(uploadFilePath, function(err, stat) {

    if (!err) {

        var fileSize = stat.size;
        console.log(fileSize);
        var fileMime=mime.lookup(uploadFilePath);
        console.log(fileMime);
        var fileExt=path.extname(uploadFilePath);
        console.log(fileExt);
        
        var offset = 0;

        //temp

        var options = {
            url: uploadURL,
            method: 'POST',
            headers: {
                'Final-Length': fileSize,
                'Content-Type': fileMime,
                'Content-Extension': fileExt
            }
        };


        request(options, function(error, response, body) {

            if (!error && response.statusCode == 201) {

                var location = response.headers.location;
                console.log(location);
                
                async.whilst(
				    function () { return offset < fileSize; },
				    function (callback) {
				        
				        setTimeout(function() {
				        
					        var options_head = {
								url: location,
								method: 'HEAD',
							};
	
							req = request(options_head);
							req.once('response', function(res) {
								if (res.statusCode==200) {
									offset=res.headers.offset;
									if (offset) {
										console.log("offset:"+res.headers.offset);
									}
									callback();
								} else {
									//always there are an exit :-)d
									offset=fileSize;
									callback();
								}
							});
							
				    	}, 1000);
				    },
				    function (err) {
				        if (err) {
				        	console.log(err);
				        }
				    }
				);

                //here we go!

                var options_send_file = {
                    url: location,
                    method: 'PATCH',
                    headers: {
                        "Content-Type": "application/offset+octet-stream",
                        "Offset": offset,
                        "Content-Length": fileSize,
                        "Expect": ""
                    }
                };

                rs = fs.createReadStream(uploadFilePath, {
                    start: offset,
                    end: fileSize
                })

                req = request(options_send_file);
                req.once('response', function(res) {
                    console.log('STATUS: ' + res.statusCode);
                    console.log('HEADERS: ' + util.inspect(res.headers));
                });

                rs.pipe(req);

            } else {
                console.log(error);
                console.log(response.statusCode);
            }

        });

    } else {

        console.log(err);
        process.exit(1);

    }

});