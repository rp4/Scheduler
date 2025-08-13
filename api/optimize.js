const ScheduleOptimizer = require('../optimizer.js');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );
    
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        const { employees, projects, assignments, algorithm, options } = req.body;
        
        if (!employees || !projects) {
            return res.status(400).json({ error: 'Missing required data' });
        }
        
        const optimizer = new ScheduleOptimizer(employees, projects, assignments || []);
        let result;
        
        switch (algorithm) {
            case 'genetic':
                result = optimizer.geneticAlgorithm(options || {});
                break;
            case 'annealing':
                result = optimizer.simulatedAnnealing(options || {});
                break;
            case 'constraint':
                result = optimizer.constraintSatisfaction(options || {});
                break;
            default:
                return res.status(400).json({ error: 'Invalid algorithm' });
        }
        
        const summary = optimizer.getOptimizationSummary(result);
        
        res.status(200).json({
            success: true,
            result: {
                solution: result.solution,
                fitness: result.fitness,
                summary
            }
        });
    } catch (error) {
        console.error('Optimization error:', error);
        res.status(500).json({ 
            error: 'Optimization failed',
            message: error.message 
        });
    }
};