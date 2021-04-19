/**
sprintf() for JavaScript 0.6

Copyright (c) Alexandru Marasteanu <alexaholic [at) gmail (dot] com>
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:
    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.
    * Neither the name of sprintf() for JavaScript nor the
      names of its contributors may be used to endorse or promote products
      derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL Alexandru Marasteanu BE LIABLE FOR ANY
DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.


Changelog:
2007.04.03 - 0.1:
 - initial release
2007.09.11 - 0.2:
 - feature: added argument swapping
2007.09.17 - 0.3:
 - bug fix: no longer throws exception on empty paramenters (Hans Pufal)
2007.10.21 - 0.4:
 - unit test and patch (David Baird)
2010.05.09 - 0.5:
 - bug fix: 0 is now preceeded with a + sign
 - bug fix: the sign was not at the right position on padded results (Kamal Abdali)
 - switched from GPL to BSD license
2010.05.22 - 0.6:
 - reverted to 0.4 and fixed the bug regarding the sign of the number 0
 Note:
 Thanks to Raphael Pigulla <raph (at] n3rd [dot) org> (http://www.n3rd.org/)
 who warned me about a bug in 0.5, I discovered that the last update was
 a regress. I appologize for that.
**/

function str_repeat(i, m) {
	for (var o = []; m > 0; o[--m] = i) {}
	return o.join('');
}

String.format = function() {
	var i = 0, a, f = arguments[i++], o = [], m, p, c, x, s = '';
	while (f) {
		if (m = /^[^\x25]+/.exec(f)) {
			o.push(m[0]);
		}
		else if (m = /^\x25{2}/.exec(f)) {
			o.push('%');
		}
		else if (m = /^\x25(?:(\d+)\$)?(\+)?(0|'[^$])?(-)?(\d+)?(?:\.(\d+))?([b-fosuxX])/.exec(f)) {
			if (((a = arguments[m[1] || i++]) == null) || (a == undefined)) {
				throw('Too few arguments.');
			}
			if (/[^s]/.test(m[7]) && (typeof(a) != 'number')) {
				throw('Expecting number but found ' + typeof(a));
			}
			switch (m[7]) {
				case 'b': a = a.toString(2); break;
				case 'c': a = String.fromCharCode(a); break;
				case 'd': a = parseInt(a); break;
				case 'e': a = m[6] ? a.toExponential(m[6]) : a.toExponential(); break;
				case 'f': a = m[6] ? parseFloat(a).toFixed(m[6]) : parseFloat(a); break;
				case 'o': a = a.toString(8); break;
				case 's': a = ((a = String(a)) && m[6] ? a.substring(0, m[6]) : a); break;
				case 'u': a = Math.abs(a); break;
				case 'x': a = a.toString(16); break;
				case 'X': a = a.toString(16).toUpperCase(); break;
			}
			a = (/[def]/.test(m[7]) && m[2] && a >= 0 ? '+'+ a : a);
			c = m[3] ? m[3] == '0' ? '0' : m[3].charAt(1) : ' ';
			x = m[5] - String(a).length - s.length;
			p = m[5] ? str_repeat(c, x) : '';
			o.push(s + (m[4] ? a + p : p + a));
		}
		else {
			throw('Huh ?!');
		}
		f = f.substring(m[0].length);
	}
	return o.join('');
}

/*
 * Date formatting
 * Add formatting of dates to the Date Object:
 * The string is searched and the following patterns are replaced as 
 * follows.  Anything else is put in the string as is
 *
 * D    day in month    0-31,       no leading zero
 * DD   day in month   00-31,     with leading zero
 * DDD  day of week   Sat, Fri
 * DDDD day of week   Saturday, Friday
 * Dth  day of month as 1st, 2nd, 3rd, 4th and so on
 * w    day of week      0-6
 *
 * M    month           1-12        no leading zero
 * MM   month          01-12      with leading zero
 * MMM  month        Jan, Feb
 * MMMM month     Januray, February
 *
 * Y    year
 * YY   two digit year            with leading zero
 * YYYY 4 digit year
 *
 * h    hour      0-12
 * H    hour      0-24
 * hh   hour     00-12
 * HH   hour     00-24
 *
 * mm   minutes  00-59
 * ss   seconds  00-59
 *
 * uuu  msecs   000-999
 *
 * O	Difference to GMT in hours	Example: +0200
 * P	Difference to GMT with colon between hours and minutes: +02:00
 * T	Timezone setting of this machine	Examples: EST, MDT ...
 * Z	Timezone offset in seconds. The offset for timezones west of UTC is always negative, 
 *      and for those east of UTC is always positive.  -43200 through 43200
 * 
 * Initially taken from http://jacwright.com/projects/javascript/date_format
 */
Date.prototype.format = function(fmt) {
    var re = /\w+|\W+/gi;
    var parts = fmt.match(re);
    var result = [];
    for(var i=0; i<parts.length; i++) {
        p = parts[i];
        if(Date.replaceChars[p]) {
            result.push(Date.replaceChars[p].call(this));
        } else {
            result.push(p);
        }
    }
    return result.join('');
};

// Utility methods for Date
Date.prototype.sub = function (other) {
    return new Date(this.getTime() - other.getTime());
}

Date.replaceChars = {
	shortMonths: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
	longMonths: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
	shortDays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
	longDays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
	
	// Day
	D:    function() { return this.getDate(); },
	DD:   function() { return (this.getDate() < 10 ? '0' : '') + this.getDate(); },
	DDD:  function() { return Date.replaceChars.shortDays[this.getDay()]; },
	DDDD: function() { return Date.replaceChars.longDays[this.getDay()]; },
	N:    function() { return this.getDay() + 1; },
	Dth:  function() { return (this.getDate() % 10 == 1 && this.getDate() != 11 ? 'st' : (this.getDate() % 10 == 2 && this.getDate() != 12 ? 'nd' : (this.getDate() % 10 == 3 && this.getDate() != 13 ? 'rd' : 'th'))); },
	w:    function() { return this.getDay(); },
	z:    function() { var d = new Date(this.getFullYear(),0,1); return Math.ceil((this - d) / 86400000); }, // Fixed now
	// Week
	W:    function() { var d = new Date(this.getFullYear(), 0, 1); return Math.ceil((((this - d) / 86400000) + d.getDay() + 1) / 7); }, // Fixed now
	// Month
	M:    function() { return this.getMonth() + 1; },
	MM:   function() { return (this.getMonth() < 9 ? '0' : '') + (this.getMonth() + 1); },
	MMM:  function() { return Date.replaceChars.shortMonths[this.getMonth()]; },
	MMMM: function() { return Date.replaceChars.longMonths[this.getMonth()]; },
	t:    function() { var d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 0).getDate() }, // Fixed now, gets #days of date
	// Year
	L:    function() { var year = this.getFullYear(); return (year % 400 == 0 || (year % 100 != 0 && year % 4 == 0)); },	// Fixed now
	o:    function() { var d  = new Date(this.valueOf());  d.setDate(d.getDate() - ((this.getDay() + 6) % 7) + 3); return d.getFullYear();}, //Fixed now
	Y:    function() { return this.getFullYear(); },
	YY:   function() { return (this.getFullYear() % 100 < 10 ? '0' : '') + (this.getFullYear() % 100) },
    YYYY: function() { return String.format("%4d", this.getFullYear()) },
	// Time
	ap:   function() { return this.getHours() < 12 ? 'am' : 'pm'; },
	AP:   function() { return this.getHours() < 12 ? 'AM' : 'PM'; },
	B:    function() { return Math.floor((((this.getUTCHours() + 1) % 24) + this.getUTCMinutes() / 60 + this.getUTCSeconds() / 3600) * 1000 / 24); }, // Fixed now
	h:    function() { return this.getHours() % 12 || 12; },
	H:    function() { return this.getHours(); },
	hh:   function() { return ((this.getHours() % 12 || 12) < 10 ? '0' : '') + (this.getHours() % 12 || 12); },
	HH:   function() { return (this.getHours() < 10 ? '0' : '') + this.getHours(); },
	mm:   function() { return (this.getMinutes() < 10 ? '0' : '') + this.getMinutes(); },
	ss:   function() { return (this.getSeconds() < 10 ? '0' : '') + this.getSeconds(); },
	uuu:  function() { var m = this.getMilliseconds(); return (m < 10 ? '00' : (m < 100 ? '0' : '')) + m; },
	// Timezone
	O: function() { return (-this.getTimezoneOffset() < 0 ? '-' : '+') + (Math.abs(this.getTimezoneOffset() / 60) < 10 ? '0' : '') + (Math.abs(this.getTimezoneOffset() / 60)) + '00'; },
	P: function() { return (-this.getTimezoneOffset() < 0 ? '-' : '+') + (Math.abs(this.getTimezoneOffset() / 60) < 10 ? '0' : '') + (Math.abs(this.getTimezoneOffset() / 60)) + ':00'; }, // Fixed now
	T: function() { var m = this.getMonth(); this.setMonth(0); var result = this.toTimeString().replace(/^.+ \(?([^\)]+)\)?$/, '$1'); this.setMonth(m); return result;},
	Z: function() { return -this.getTimezoneOffset() * 60; },
	// Full Date/Time
	c: function() { return this.format("Y-m-d\\TH:i:sP"); }, // Fixed now
	r: function() { return this.toString(); },
	U: function() { return this.getTime() / 1000; }
};

