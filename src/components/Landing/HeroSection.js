import HeroNav from "./NavHero";
export default function HeroSection() {
    return (
        <div className="hero-section" style={{
            background: 'url(/assets/landing_bg.png) no-repeat center center',
            backgroundSize: 'cover'
        }}>
            <HeroNav />
            <div className="container text-center text-white" style={{ paddingTop: '180px', paddingBottom: '350px' }}>
                <h1 className="fw-semibold" style={{ fontSize: "48px" }}>
                    One Space For Everyone, One Place To
                    <br />
                    Manage It All.
                </h1>
                <p className="lead mt-4 mb-5">Your gate to new experience and the one to organize</p>
                <div className="d-flex justify-content-center" style={{ gap: '24px' }}>
                    <button className="btn btn-lg btn-success mt-3 px-5 rounded-3 py-2"
                        style={{ backgroundColor: "#00DC85", border: "none", fontSize: '18px' }}>Member</button>
                    <button className="btn btn-lg btn-outline-light mt-3 px-5 rounded-3 py-2"
                        style={{ backgroundColor: "#0076EA", border: "none", fontSize: '18px' }}>Administrative</button>
                </div>
            </div>
        </div>
    );
}
