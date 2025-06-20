const jwt = require('jsonwebtoken')
require('dotenv').config()

function autenticarToken(req, res, next) {

    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]


    if (!token) {
        return res.sendStatus(401) // Unauthorized
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            console.log(err);

            return res.sendStatus(403) // Forbidden


        }
        req.user = user
        next()
    })

}

function verificarSuperadmin(req, res, next) {
    if (req.user.role !== 'superadmin') {
        return res.status(403).json({ error: 'Acesso negado. Rota exclusiva ' });
    }
    next();
}




module.exports = { autenticarToken, verificarSuperadmin };